#node-stream-reader

##Purpose
Node `ReadableStream` instances allow receiving data as a sequence of asynchronous `data` events or by calling the
synchronous `read([size])`. `data` events send blocks of data as it is avaialble, but the number and size of the blocks is unpredicatable, leaving the receiver to wait for and reassemble the desired data. The `read([size])` method will return a block of the requested size if enough data is available, but if not it returns null and the caller must try again.

In some use cases--such as for message protocols with messages of known size--the reader wants to wait for a block of
a specific size.

**node-stream-reader** allows a client to request a block of a specific size via an asynchronous callback. 

##Usage
```
const TIME_OUT_MS = 5000;
var StreamReader = require('node-stream-reader');

var stream = getReadableStreamSomehow();
var reader = new StreamReader(stream);

//Read 1K from the stream, waiting up to 5 seconds if necessary
reader.read(1024, function(err, data){
	if( err ) {
		//...handle the error...
	} else {
		//...do something with the data
	}
	reader.close();	
}, TIMEOUT_MS);
```