var app = require('./app');
var async = require('async');
var DirectoryWalker = require('./Walker');
var fs = require('fs');
var mediaDirectory = process.argv[2];
var server;

async.waterfall(
    [   // Get Files
        function(done){
            var walker = new DirectoryWalker();
            var i = 0;

            // Register routes for each file
            walker.on('file', function(file){
                var path = '/media/' + i++;

                fs.stat('./' + file, function(err, stat){

                    var fileSize = stat.size;

                    app.get(path, function(req, res){

                        /*
                         *  Courtesy of paolorossi(@github)
                         *  https://gist.github.com/paolorossi/1993068
                         */
                        var pos = [0,fileSize-1];
                        var chunksize = fileSize;
                        var range, rs;

                        // If a range is requested send it, otherwise send all
                        if (req.headers.range){
                            pos = req.headers.range.replace(/bytes=/,'').split('-').map(function(item){ console.log(item); return Number(item); });
                            if(pos[1] === 0){ pos[1] = fileSize-1; }
                        }

                        console.log(pos[0] + '-' + pos[1] + ' / ' + fileSize);

                        // Write our headers
                        res.writeHead(206, {
                            'Content-Range': 'bytes ' + pos[0] + '-' + pos[1] + '/' + fileSize,
                            'Accept-Ranges': 'bytes',
                            'Content-Length': chunksize,
                            'Content-Type': 'video/mp4',
                        });

                        // Send the file!
                        rs = fs.createReadStream(file, {start: pos[0], end: pos[1]});
                        rs.pipe(res);
                    });

                });
            });

            walker.on('done', function(results){ done(null, results.files); });
            walker.walk(mediaDirectory);
        },

        // Create app routes
        function(files,done){
            app.get('/', function(req,res){
               res.render('index', {files: files});
            });
            done();
        }
    ],
    function(err, result){
        server = app.listen(3000, function(){
            console.log('Listening on port %d', server.address().port);
        });
    }
);
