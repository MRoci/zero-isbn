# zero-isbn
 node.js modules that validates an ISBN, parse lang group and fetch some metadata from Google Books and OpenLibrary 
### isValidIsbn(isbn)
  return `true` if the string is a valid ISBN10 or ISBN13.
  
  
### detectLang13(isbn)
  return the country code of the corresponding ISBN13.
  return `'none'` if it's a ISBN10 or Invalid ISBN.
  
### fetchMetadata(isbn, callback(err, book))
  check if it's a valid ISBN, parse lang code and query Google's Book and OpenLibrary's API to retrieve metadata.
  
    err: 
         null if the book was found
         the error type otherwise
    book: 
          book = {
         'title' : 'none',
         'authors' : 'none',
         'publisher' : 'none',
         'date' : 'none',
         'pages' : 'none',
         'lang' : 'none',
         'thumbnail' : 'none',
         'isbn' : 'none'
          };
 
    Always defined, field could be setted with 'none' value or corresponding metadata
