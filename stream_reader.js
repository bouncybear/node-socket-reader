/******************************************************************************
*
*	stream_reader.js
*	
*	An instance of this class provides a buffered stream reader. It handles
*	a series of "data" events from a streaming stream and buffers the data in
*	memory until the requested amound of data is available.
*
*	Multiple sequential reads can be performed against the same instance.
*
******************************************************************************/

function BufferedStreamReader(stream) {
	this.currentBuffer = null;
	this.stream = stream;
	this.dataHandler = this.onData.bind(this);
	this.closeHandler = this.onClose.bind(this);

	this.stream.pause();

	this.stream.on("data", this.dataHandler);
	this.stream.on("close", this.closeHandler);
}

BufferedStreamReader.prototype.read = function(readsize, callback, timeout) {
	if( this.readCallback ) {
		callback({message: "Another read operation is already in progress"}, null);
	}

	if( readsize == 0 ) {
		callback(null, new Buffer(0));
	} else if( readsize > 0 && this.currentBuffer && this.currentBuffer.length >= readsize ) {
		var requestedBuffer = new Buffer(this.currentBuffer.slice(0, readsize) );
		this.currentBuffer = new Buffer(this.currentBuffer.slice(readsize, this.currentBuffer.length));
		callback(null, requestedBuffer);
	} else {
		this.readSize = readsize;
		this.readCallback = callback;

		//
		if( timeout ) {
			if( this.stream.setTimeout ) {
				this.timeoutHandler = this.onTimeout.bind(this);
				this.stream.setTimeout(timeout, this.timeoutHandler);
			} else {
				console.warn("Stream does not support timeout");
			}		
		}

		this.stream.resume();
	}
}

BufferedStreamReader.prototype.close = function() {
	this.stream.pause();
	this.removeListeners();
	this.currentBuffer = null;
}

BufferedStreamReader.prototype.removeListeners = function() {
	this.stream.removeListener("data", this.dataHandler);
	if( this.timeoutHandler ) {
		this.stream.removeListener("timeout", this.timeoutHandler);
		this.timeoutHander = null;
	}
	this.stream.removeListener("close", this.closeHandler);
}

BufferedStreamReader.prototype.onData = function(chunk) {
	if( this.currentBuffer ) {
		this.currentBuffer = Buffer.concat([this.currentBuffer, chunk]);
	} else {
		this.currentBuffer = chunk;
	}

	if( this.readCallback ) {
		if( this.currentBuffer.length === this.readSize ) {
			this.stream.pause();
			
			var callback = this.readCallback;
			this.readCallback = null;
			var requestedBuffer = this.currentBuffer;
			this.currentBuffer = null;
			
			callback( null, requestedBuffer); 
		} else if( this.currentBuffer.length > this.readSize ) {
			this.stream.pause();
			
			var requestedBuffer = new Buffer(this.currentBuffer.slice(0, this.readSize) );
			var remainingBuffer = new Buffer(this.currentBuffer.slice(this.readSize, this.currentBuffer.length));
			this.stream.unshift(remainingBuffer);

			var callback = this.readCallback;
			this.readCallback = null;
			this.currentBuffer = null;

			callback(null, requestedBuffer);
		} else {
			//Still waiting for more data before the read can be satisfied
		}
	}
}

BufferedStreamReader.prototype.onTimeout = function() {
	this.removeListeners();
	if( this.readCallback ) {
		var callback = this.readCallback;
		this.readCallback = null;
		if( this.currentBuffer ) {
			this.stream.unshift(this.currentBuffer);
			this.currentBuffer = null;
		}
		callback({message: "stream timeout"}, null);
	} else {
		console.error("No stream read callback was installed")
	}
}

BufferedStreamReader.prototype.onClose = function() {
	this.removeListeners();

	if( this.readCallback ) {
		var callback = this.readCallback;
		this.readCallback = null;
		callback({message: "stream closed"}, null);
	}
}

module.exports = BufferedStreamReader;