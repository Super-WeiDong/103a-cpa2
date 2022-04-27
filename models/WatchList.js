'use strict';
const mongoose = require( 'mongoose' );
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;
const Mixed = Schema.Types.Mixed;

var watchListSchema = Schema( {
    name: String,
    category: String,
    runtime: Number,
    language: String,
} );

module.exports = mongoose.model( 'WatchList', watchListSchema );
