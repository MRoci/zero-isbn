function isValidIsbn(isbn) {
        let isValid = false;
        isbn = isbn.replace(/\-/gi,'');
        if(/^\d{9}[0-9|Xx]$/.test(isbn)) { // is a ISBN10
            let sum = 0;
            let weigth = 10;
            for(i = 0; i<10; i++,weigth--) {
                if(i == isbn.length-1  && isbn[i].toUpperCase() == 'X') 
                    sum += 10*weigth;
                    
                else
                    sum += parseInt(isbn[i])*weigth; 
            }
            isValid = ((sum%11) == 0);

        } else if(/^\d{13}$/.test(isbn)) { // is a ISBN13
            let sum = 0;
            let weigth = 1;
            for(i=0; i<12; i++) {
                weigth = ((i%2) == 0) ? 1 : 3;
                sum += parseInt(isbn[i])*weigth;
            }
            isValid = ((10 - sum%10) % 10) == parseInt(isbn[isbn.length-1]);
        }
        return isValid;   
}

function fetchMetadata(isbn, cb) {
    let template = {
        'title' : 'none',
        'authors' : 'none',
        'publisher' : 'none',
        'date' : 'none',
        'pages' : 'none',
        'lang' : 'none',
        'thumbnail' : 'none',
        'isbn' : 'none'
    };

    if(!isValidIsbn(isbn))
        return cb(new Error('Invalid ISBN'), template);

    isbn=isbn.replace(/\-/gi,'');
    if(isbn.length == 13)
        template.lang = detectLang13(isbn);

    template.isbn = isbn;

    googleData(isbn, function(err, book) {
        if(err)
            return olibData(isbn, function(err, book) {
                if(err)
                    return cb(err, template);
                for(let attr in book) { template[attr] = book[attr]; }
                return cb(null,template);
            });
        else {
            for(let attr in book) { template[attr] = book[attr];  }
            return cb(null,template);
        }
    });
}


function googleData(isbn, cb) {
    let https = require('https');
    let GOOGLE_BASE = 'www.googleapis.com';
    let GOOGLE_PATH = '/books/v1/volumes?q=isbn:' + isbn;
    let options = {
        host: GOOGLE_BASE,
        path: GOOGLE_PATH 
    };

    let req = https.get(options, function(response) {
        let body = '';
        response.on('data', function(d) {
            body += d;
        });

        response.on('end', function() {
            if(response.statusCode != 200)
                return cb(new Error('Wrong response code'), null);

            let data = JSON.parse(body);
            
            if(!data.totalItems)
                return cb(new Error('no book found'), null);

            data = data.items[0].volumeInfo;
            let book = {
                'title'  : data.title,
                'authors': data.authors,
                'publisher': data.publisher,
                'date' : data.publishedDate,
                'pages': data.pageCount,
                'lang' : data.language,
                'thumbnail' : data.imageLinks.thumbnail
            };
            return cb(null, book);
        });

    }).on('error', function(err) {
        return cb(err, null);
    });

    req.end();
}

function olibData(isbn, cb) {
    let https = require('https');
    let OPEN_BASE = 'openlibrary.org';
    let OPEN_PATH = '/api/books?bibkeys=ISBN:'+isbn+'&format=json&jscmd=data';
    let options = {
        host: OPEN_BASE,
        path: OPEN_PATH
    };

    let req = https.get(options, function(response) {
        let body = '';
        response.on('data', function(d) {
            body += d;
        });

        response.on('end', function() {
            if(response.statusCode != 200)
                return cb(new Error('Wrong response code'), null);

            let data = JSON.parse(body);
            data = data['ISBN:' + isbn];

            if(!data)
                return cb(new Error('No book found'), null);

            let authors = [];
            for(i = 0; i < data.authors.length; i++) { authors.push(data.authors[i].name); }
            let book = {
                'title' : data.title,
                'authors': authors,
                'publisher': data.publishers[0].name,
                'date' : data.publish_date,
                'pages' : data.number_of_pages,
                'thumbnail' : data.cover.medium

            };
            return cb(null,book);
        });

    }).on('error', function(err) {
        return cb(err, null);
    });

    req.end();
}

function detectLang13(isbn) {
    isbn = isbn.replace(/\-/gi,'');
    if(!isValidIsbn(isbn) || isbn.length != 13) {
        return 'none';
    }

    let fs = require('fs');
    let prefix = isbn.substr(0,3);
    let suffix = isbn.substr(3);
    let len = 1;

    if(prefix == '978') {
        if(suffix[0] == '6')
            len = 3;
        else if(suffix[0] == '8')
            len = 2;
        else if(suffix[0] == '9') {
            if(parseInt(suffix[1]) < 5)
                len = 2;
            else if(parseInt(suffix[1]) < 9)
                len = 3;
            else {
                if(parseInt(suffix[2]) < 9) 
                    len = 4;
                else
                    len = 5;
            }
        }
    let lang_code = suffix.substr(0, len);
    let content = fs.readFileSync('lang_codes');
    let country = JSON.parse(content);

    return country[lang_code];
    }

    else if(prefix == '979') {
        let code = suffix.substr(0,2);
        if(code == '10')
            return 'fr';
        if(code == '11')
            return 'srk';
        if(code == '12')
            return 'it';
    }
}


module.exports = {
    isValidIsbn,
    fetchMetadata,
    detectLang13
};
