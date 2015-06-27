var assert = require("assert");
var StreamReader = require("../stream_reader.js");

var EventEmitter = require('events').EventEmitter;
var util = require('util');
function MockStream() {
   EventEmitter.call(this);
   this.streaming = true;
   this.waitingBuffer = null;
};
util.inherits(MockStream, EventEmitter);
MockStream.prototype.end = function() {this.emit("close")};
MockStream.prototype.destroy = function() {this.end()};
MockStream.prototype.write = function(buffer) {
	if( this.streaming ) {
		this.emit("data", buffer);
	} else if(this.waitingBuffer) {
		this.waitingBuffer = Buffer.concat(this.waitingBuffer, buffer);
	} else {
		this.waitingBuffer = buffer;
	}
};
MockStream.prototype.pause = function() {
	this.streaming = false;
};
MockStream.prototype.resume = function() {
	this.streaming = true;
	if( this.waitingBuffer ) {
		var buffer = this.waitingBuffer;
		this.waitingBuffer = null;
		this.emit("data", buffer);
	}
};
MockStream.prototype.unshift = function(chunk) {
	if( this.streaming ) {
		this.emit("data", chunk);
	} else if(this.waitingBuffer) {
		this.waitingBuffer = Buffer.concat(chunk, this.waitingBuffer);
	} else {
		this.waitingBuffer = chunk;
	}
}

describe("Buffered stream reader", function(){
	it("Read of 0 bytes returns immediately with empty buffer", function(done){
		var mockStream = new MockStream();
		var reader = new StreamReader(mockStream);
		reader.read(0, function(err, buffer){
			assert(err == null, "Empty read should never trigger an error");
			assert(buffer != null, "Expect an empty buffer, not a null buffer");
			assert(buffer.length == 0, "Expect an empty buffer");
			done();
		});
	});

	it("Read waits for requested number of bytes", function(done){
		var mockStream = new MockStream();
		var reader = new StreamReader(mockStream);

		reader.read(10, function(err, chunk){
			assert(!err, "No error is expected");
			assert(chunk, "Buffer is expected");
			assert.equal(chunk.length, 10, "Chunk size should match requested size");

			for(var i = 0; i < 10; i++) {
				assert.equal(chunk[i], i);
			}

			done();
		});

		for(var i = 0; i < 10; i++) {
			mockStream.emit("data", new Buffer([i]));
		}
	});

	it("Read returns subsets of large buffers", function(done){
		var mockStream = new MockStream();
		var reader = new StreamReader(mockStream);

		mockStream.emit("data", new Buffer([0,1,2,3,4,5,6,7,8,9]));

		reader.read(5, function(err, chunk){
			assert(!err, "No error is expected");
			assert(chunk, "Buffer is expected");
			assert.equal(chunk.length, 5, "Chunk size should match requested size");

			for(var i = 0; i < 5; i++) {
				assert.equal(chunk[i], i);
			}

			done();
		});
	});

	it("Sequencial reads", function(done){
		var mockStream = new MockStream();
		var reader = new StreamReader(mockStream);

		mockStream.emit("data", new Buffer([0,1,2,3,4,5,6,7,8,9]));

		reader.read(5, function(err, chunk){
			assert(!err, "No error is expected");
			assert(chunk, "Buffer is expected");
			assert.equal(chunk.length, 5, "Chunk size should match requested size");

			for(var i = 0; i < 5; i++) {
				assert.equal(chunk[i], i);
			}
		});

		reader.read(10, function(err, chunk){
			assert(!err, "No error is expected");
			assert(chunk, "Buffer is expected");
			assert.equal(chunk.length, 10, "Chunk size should match requested size");

			for(var i = 0; i < 10; i++) {
				assert.equal(chunk[i], i+5);
			}

			done();
		});

		mockStream.emit("data", new Buffer([10,11,12,13,14,15,16,17,18,19]));
	});

	it("Read callback receives timeout error for stream that supports 'setTimeout'", function(done){
		var mockStream = new MockStream();
		mockStream.setTimeout = function(timeout, callback){
			this.on("timeout", callback);
		};

		var reader = new StreamReader(mockStream);

		mockStream.emit("data", new Buffer([0,1]));
		reader.read(5, function(err, chunk){
			assert(err, "Timeout error is expected");
			assert(!chunk, "No buffer is expected");
			done();
		}, 100);

		mockStream.emit("timeout");
	});
});
