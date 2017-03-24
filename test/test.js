let assert = require('assert');
let isbn = require('../index.js');
let nock = require('nock');

describe('ISBN validator', function() {
    it('Return true with ISBN: 978-88-420-5115-2', function(done) {
        let first = isbn.isValidIsbn('978-88-420-5115-2');
        assert.equal(first, true);
        done();
    });
    it('Return true with ISBN: 02015580250', function(done) {
        let second = isbn.isValidIsbn('0201558025');
        assert.equal(second, true);
        done();
    });
    it('Return false with ISBN: blablabla', function(done) {
        let third = isbn.isValidIsbn('blablabla');
        assert.equal(third, false);
        done();
    });  
    it('Return false with ISBN: 9791343567891', function(done) {
        let fourth = isbn.isValidIsbn('9791343567891');
        assert.equal(fourth, false);
        done();
    });
    it('Return false with ISBN: 1234567898', function(done) {
        let fifth = isbn.isValidIsbn('1234567898');
        assert.equal(fifth, false);
        done();
    });
});

describe('Detect Lang with ISBN13', function() {
    it('Return \'it\' with ISBN: 978-88-420-5115-2', function(done) {
        assert.equal(isbn.detectLang13('978-88-420-5115-2'), 'it');
        done();
    });
    it('Return \'none\' with ISBN: 0201558025', function(done) {
        assert.equal(isbn.detectLang13('0201558025'), 'none');
        done();
    });
    it('Return \'none\' with ISBN: 9784567898765', function(done) {
        assert.equal(isbn.detectLang13('9784567898765'), 'none');
        done();
    });
    it('Return \'en\' with ISBN: 9780545139700', function(done) {
        assert.equal(isbn.detectLang13('9780545139700'), 'en');
        done();
    });
    it('Return \'fr\' with ISBN: 979-10-91799-44-7', function(done) {
        assert.equal(isbn.detectLang13('979-10-91799-44-7'),'fr');
        done();
    });
});

describe('Fetching metadata', function() {
    let misbn = '9788804507949';
    let GOOGLE_BASE = 'https://www.googleapis.com';
    let GOOGLE_PATH = '/books/v1/volumes?q=isbn:'+misbn;
    let OLIB_BASE = 'https://openlibrary.org';
    let OLIB_PATH = '/api/books?bibkeys=ISBN:'+misbn+'&format=json&jscmd=data';
    
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

    let gresp = {
        "kind": "books#volumes",
        "totalItems": 1,
        "items": [{
                "kind": "books#volume",
                "id": "nobIAAAACAAJ",
                "etag": "Tv1iNrxU27I",
                "selfLink": "https://www.googleapis.com/books/v1/volumes/nobIAAAACAAJ",
                "volumeInfo": {
                    "title": "Ristorante al termine dell'universo",
                    "authors": ["Douglas Adams"],
                    "publisher": "Mondadori",
                    "imageLinks": {
                        "smallThumbnail": "http://books.google.com/books/content?id=nobIAAAACAAJ&printsec=frontcover&img=1&zoom=5&source=gbs_api",
                        "thumbnail": "http://books.google.com/books/content?id=nobIAAAACAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api"
                    }
                }
        } ]
    };

    let gerr = {
         "kind": "books#volumes",
         "totalItems": 0
    };

	let oresp = {};	
	oresp["ISBN:"+misbn] = {
      "publishers":[
         {
            "name":"Mondadori"
         }
      ],
      "subtitle":"a foundation for computer science",
      "title":"Ristorante al termine dell'universo",
      "notes":"Includes bibliographical references (p. 604-631) and index.",
      "number_of_pages":657,
      "cover":{
         "small":"https://covers.openlibrary.org/b/id/135182-S.jpg",
         "large":"https://covers.openlibrary.org/b/id/135182-L.jpg",
         "medium":"https://covers.openlibrary.org/b/id/135182-M.jpg"
      },
      "publish_date":"1994",
      "key":"/books/OL1429049M",
      "authors":[
         {
            "url":"https://openlibrary.org/authors/OL720958A/Ronald_L._Graham",
            "name":"Douglas Adams"
         }
      ]
   }

   let oerr = {};

   it('Invalid ISBN test', function(done) {
        isbn.fetchMetadata('12345678', function(err,book) {
            assert.notEqual(err, null);
            assert.deepEqual(book, template);
            done();
        });
    });
    it('Fetch metadata with Google', function(done) {
        nock(GOOGLE_BASE).get(GOOGLE_PATH).reply(200, JSON.stringify(gresp));
        isbn.fetchMetadata(misbn, function(err,book) {
            assert.equal(err, null);
            assert.equal(book.title, "Ristorante al termine dell'universo");
            assert.equal(book.publisher, "Mondadori");
            assert.deepEqual(book.authors, gresp.items[0].volumeInfo.authors);
            done();
        });
    });
    it('Fetch metadata with OpenLibrary', function(done) {
        nock(GOOGLE_BASE).get(GOOGLE_PATH).reply(200, JSON.stringify(gerr));
		nock(OLIB_BASE).get(OLIB_PATH).reply(200, JSON.stringify(oresp));
        isbn.fetchMetadata(misbn, function(err,book) {
            assert.equal(err,null);
            assert.equal(book.publisher, ["Mondadori"]);
            assert.equal(book.title, "Ristorante al termine dell'universo");
            assert.equal(book.authors, "Douglas Adams");
            done();
        });
    });
    it('Bad response code', function(done) {
        nock(GOOGLE_BASE).get(GOOGLE_PATH).reply(404);
        nock(OLIB_BASE).get(OLIB_PATH).reply(404);
        isbn.fetchMetadata(misbn, function(err,book) {
            template.isbn = misbn;
            template.lang = "it";
            assert.notEqual(err, null);
            assert.deepEqual(book, template);
            done();
        });
    });
    it('Book not found', function(done) {
        nock(GOOGLE_BASE).get(GOOGLE_PATH).reply(200, JSON.stringify(gerr));
        nock(OLIB_BASE).get(OLIB_PATH).reply(200, JSON.stringify(oerr));
        isbn.fetchMetadata(misbn, function(err,book) {
            template.isbn = misbn;
            template.lang = "it";
            assert.notEqual(err, null);
            assert.deepEqual(book, template);
            done();
        });
    });
});
