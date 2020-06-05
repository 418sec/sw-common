'use strict';

const EventEmitter = require('events').EventEmitter
const NetworkError = require('./error');
const createDefer = require('./defer');
const defer = createDefer();

class ServerSocket extends EventEmitter {
    constructor(options, network, fromHost) {
        super(options);
        this._options = options;
        this._nw = network;
        // some stats
        this._listening = false;
        const ips = network.nsLookupBy(fromHost);
        if (ips.length === 0) {
            throw Error(`unknown host "${fromHost}"`);
        }
        // normalize
        this._host = network.nsLookupBy(ips[0])[0];
        this._cp = undefined; // counterparty socket
        this._connections = new Set(); // all client sockets forked by this server
    }
    address() {
        return { port: this._port, family: 'IPv4', address: this._host };
    }
    close(cb) {
        this._blockNewConnections = true;
        if (cb) {
            this._closeCB = cb;
        }
        if (this._connections.size === 0) {
           
            // there are no connection can close immediatly
            defer(() => {
                // first we emit close
                this.emit('close');
                if (cb) {
                    const err = new NetworkError('ERR_SERVER_NOT_RUNNING', '', '[ERR_SERVER_NOT_RUNNING]: Server not running');
                    cb.call(this, err);
                }
            });
            return;
        }
    }
    getConnections(fn) {
        if (typeof fn === 'function') {
            defer(() => {
                fn.call(this, undefined, this._connections.size);
            });
        }
        return this; // what to do here?
    }
    syn(remoteSocket, fn) {
        //(options, network, fromHost) {
        if (!this._listening || this._blockNewConnections) {
            // send back error
            defer(fn, true); // send back an true in the error field
            return;
        }
        //   constructor(options, network, fromHost) {
        const socket = new Socket({}, this._nw, this._host, this._port, this);
        // sync_ack, send socket back
        // from here on its all sync
        socket._remoteHost = remoteSocket._host;
        socket._remotePort = remoteSocket._port;
        socket._connecting = true; // a bit useless in this context but lets set it
        socket._cp = remoteSocket;
        this._connections.add
        defer(fn, false, socket); // sync
        return;
    }
    ref() {

    }
    unref() {

    }
    listen(port, host /*ipv4 address*/, cb) {
        let _port;
        let _host;
        let _cb;
        //  processArguments
        if (arguments.length === 0) {
            throw new Error('a listen port value of "0" is not mocked');
        }
        if (arguments.length === 1) {
            _port = port;
        }
        else if (arguments.length === 2) {
            _port = port;
            if (typeof host === 'function') {
                _cb = host;
                _host = this._host;
            }
            else if (typeof host === 'string') {
                _host = host;
            }
            if (!_host) {
                throw new Error(`second argument=${host} was not a function or hostname (string value)`);
            }
        }
        else if (arguments.length === 3) {
            _port = port;
            _host = host;
            _cb = cb;
        }
        else {
            throw new Error(`Invalid number of arguments=${arguments.length} to "listen"`)
        }
        // now check all 3 arguments
        if (_cb) {
            if (typeof _cb !== 'function') {
                throw new Error(`callback must be a function`);
            }
        }
        if (_host === '0.0.0.0' || _host === undefined || _host === 'localhost' || _host === '127.0.0.1') {
            _host = this._host;
        }
        if (typeof _host !== 'string') {
            throw new Error(`host=${_host} is not a string`);
        }
        if (typeof _port !== 'number') {
            if (isFinite(_port)) {
                _port = parseInt(_port);
            }
        }
        if (typeof port === 'string') {
            throw new Error(`port=${port} argument must be an`);
        }
        if (!(typeof port === 'number' && isFinite(port) && port >= 0 && port < 65536)) {
            const error = new RangeError(`Port should be >=0 and < 65536. Received ${port}`);
            error.code = 'ERR_SOCKET_BAD_PORT';
            throw error;
        }
        //claim the port
        const assigned = this._nw.claimPort(_port, _host, this);
        if (assigned === 0) { // this means port/address in use
            //code, syscall, message, aux){
            const err = new NetworkError('EADDRINUSE', 'listen', `listen EADDRINUSE ${host}:${port}`);
            defer(() => {
                this._connecting = false;
                this._destroyed = true;
                // not close is emitted here defer(()=> this.emit('close', true));
                this.emit('error', err);
            });
            return;
        }
        if (_cb) {
            this.once('listening', () => {
                _cb.apply(this);
            });
        }
        // it is claimed
        defer(() => {
            this._port = assigned;
            this._listening = true;
            // not close is emitted here defer(()=> this.emit('close', true));
            this.emit('listening');
        });
        return;
    }
}

class Socket extends EventEmitter {
    constructor(options, network, fromHost, port, server) {
        super(options);
        this._options = options;
        this._nw = network;
        this._buffer = Buffer.alloc(16384);
        // some stats
        this._bytesRead = 0;
        this._bytesWritten = 0;
        this._connecting = false;
        this._destroyed = false;
        this._connected = false;
        this._writable = false;
        const ips = network.nsLookupBy(fromHost);
        if (ips.length === 0) {
            throw Error(`unknown host "${fromHost}"`);
        }
        this._host = ips[0];
        this._port = port;
        this._cp = undefined; // counterparty socket
        this._server = server;
    }
    get bufferSize() {
        return this._buffer.byteLength;
    }
    get bytesRead() {
        return this._bytesRead;
    }
    get bytesWritten() {
        return this._bytesWritten;
    }
    get connecting() {
        return this._connecting;
    }
    get destroyed() {
        return this._destroyed;
    }
    get localPort() {

    }
    get pending() {

    }
    get remoteAddress() {

    }
    get remoteFamily() {

    }
    get remotePort() {

    }
    address() {
        return { port: this._port, family: 'IPv4', address: this._host };
    }
    // only for outgoing connections
    // incomming connections use "this.accept call" (like posix counterpart)
    connect(port, host, cb) {
        // does the remote host exist and is listened to
        const serverSocket = this._nw.getRemoteSocket(port, host);
        if (!(serverSocket instanceof ServerSocket)) {
            const err = new NetworkError('ENOENT', 'connect', `connect ENOENT ${host}:${port}`);
            defer(() => {
                this._connecting = false;
                this._destroyed = true;
                // not close is emitted here defer(()=> this.emit('close', true));
                this.emit('error', err);
            });
            return;
        }
        //
        this._connecting = true;
        if (cb) {
            this.once('connect', cb);
        }
        // creates the counterpart of this channel
        // the callback should absoluutly be a deferred call
        // "syn" is always a method on a server socket
        // reserve port on this socket
        // 1. claim local port (randomly chosen).
        this._port = this._nw.claimPort(0, this._host, this);
        serverSocket.syn(this, /*synack*/(err, socket) => {
            // from here on its all sync
            if (err) {
                const error = new NetworkError('ECONNREFUSED', 'ECONNREFUSED', `connect ECONNREFUSED ${host}:${port}`);
                defer(() => {
                    this._connecting = false;
                    this._destroyed = true;
                    // not close is emitted here defer(()=> this.emit('close', true));
                    this.emit('error', error);
                });
                return;
            }
            this._remoteHost = socket._host;
            this._remotePort = socket._port;
            this._cp = socket;
            socket.ack(); // will emit "connect"
        });
        return this;
    }
    // fully configured
    // just emit connected "connected"
    ack() {
        // only need to set the remote host etc
        this._connecting = false;
        this._connected = true;
        if (this._server) {
            this._server.emit('connection', this);
            this._cp.ack();
        }
        defer(() => {
            this.emit('connected');
        });
    }

    destroy(error) {
        if (!this._destroyed) {
            this._destroyed = true;
        }
        // close immediatly  
    }
    end(data, encoding, cb) {
        // there should always be data
        if (data){

        }
        let _cb;
        if (cb && typeof cb === 'function'){
            _cb = cb;
        }
        if (encoding){
            if (typeof encoding === 'function'){
                _cb = cb;
            }
        }

        // data
        // data callback
        // data encoding
        // data encoding callback
    }
    pause(error) {

    }
    ref() {

    }
    setEncoding(encoding) {

    }
    setKeepAlive(enable, initialDelay) {
        // enable
        // initialDelay
        // enable, initialDelay
    }
    setNoDelay(noDelay) {
        // noDelay
        // initialDelay
        // enable, initialDelay
    }
    setTimeout(timeout, callback) {
        // timeout
        // timeout, callback
    }
    unref() {

    }
    _accept() {

    }
    write(data, encoding, callback){
        let _protoName;
        let _endocing;
        if (data === null){
            defer(()=>{
               const err = new TypeError('[ERR_STREAM_NULL_VALUES]: May not write null values to stream');
               this.emit('error', err);
            });
            return true;
        }
        if (data === undefined){
            _protoName = 'undefined';
        }
        if (!_protoName){
            const proto = Object.getPrototypeOf(data);
            if (proto){
                _protoName = proto.constructor && proto.constructor.name;
            }
            _protoName = '[unknown type]';
        }
        // check data
        if (!(_protoName === 'string' || _protoName === 'Uint8Array' || _protoName === 'Buffer')){
            defer(()=>{
                const err = new TypeError(`[ERR_INVALID_ARG_TYPE]: The "chunk" argument must be of type string or an instance of Buffer. Received an instance of ${_protoName}`);
                this.emit('error', err);
            });
            return true; // nothing stuck in userspace
        }
        // check encoding
        if (typeof data === 'string'){
            _endcoding = 'utf8';
            if (typeof encoding === 'string'){
                _encoding = encoding;
            }
        }
        // check callback
        if (arguments.length === 2 && typeof encoding === 'function'){
            _cb = encoding;
        }
        // 

        
    }
}

module.exports = { ServerSocket, Socket };


