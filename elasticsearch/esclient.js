/**
 * Created by govind on 7/24/16.
 */

'use strict';
// This module provides the interface to the DB.

var elasticsearch = require('elasticsearch');
var esIndicesConfig = require('./esIndicesConfig');
//var deleteByQuery = require('elasticsearch-deletebyquery');
var _ = require( 'lodash' );

var esPort = process.env.ES_PORT ? process.env.ES_PORT : '9200';
const MAX_RESULT_WINDOW = 10000;

var _client = elasticsearch.Client({
  host: 'localhost:' + esPort,
  log: 'info'
});


exports.getFilterItems = getFilterItems;
exports.getItems = getItems;
exports.getItem = getItem;
exports.deleteItem = deleteItem;
exports.createIndex = createIndex;
exports.initIndices = initIndices;
exports.addItem = addItem;

function createIndex(indexDef) {
  _client.create(indexDef, function(error, response) {
    // ...
  });
}

function initIndices (allIndices, callback) {

  let promises = _.map(allIndices, (indexSetting) => {

    return _client.indices.exists({
      index: indexSetting.index
    }).then((exists) => {
      if (!exists) {
        console.log("initIndices creating the index: ", indexSetting);
        return _client.indices.create(indexSetting);
      }
      console.log("returning undefined");
      return undefined;
    });
  });


  Promise.all(promises).then((result) => {
    console.log("initIndices promise all: ", result);
    callback();
  }).catch((err) => {
    log.error('failed to create inices', err);
    callback(err);
  });
}

function getItem(index, id, query, callback) {

  let param = {
    index: index,
    id: id,
    body: {'query': query},

  };

  _client.search(param, (err, resp) => {
    if(err) {
      console.log("some error with the query: ", err);
      callback(err);
    } else if(!resp) {
      console.log("no error no response strange!");
      callback({'message': 'no error no response strange!'});
    } else {
      console.log("getItem: resp length: ",resp.hits.hits.length);
      console.log("getItem: resp: ",resp.hits.hits);
      callback(undefined, resp.hits.hits[0]._source);

    }
  });

}


function getItems( index, params, query, callback1) {
  console.log("getItems: index: ", index);
  console.log("getItems: params: ", params);
  console.log("getItems: query: ", query);

  var indexName = index;

  if(index === "digitallibrary")
    indexName = "documents";

  let body = {};

  if(query.hasOwnProperty('query') && query.query.hasOwnProperty('camerafilter')) {
    console.log("$%$%$$%$%$%$%$%$%$%$");
    let q = {match: {['exif.Exif IFD0.Model'] : query.query.camerafilter}};
    body.query = q;
  }

  // the search can take fields and their values for filtering the resultset
  // The body section of the query statement 'param' will have filter conditons specified
  let param = {
    index: indexName,
    from: params.from,
    size: params.size,
    body: body
  };

  console.log("getItems param: ", JSON.stringify(param));

  return _client.search( param,
    ( err, resp ) => {
      if ( err ) {
        console.log("getItems: err: ",err);
        callback1(err);
      } else if ( !resp  ) {
        console.log("getItems: err: ",err);
        callback1(err);
      } else {
        // console.log("getItems: resp: ",resp);
        console.log("getItems: resp: ",resp.hits.hits.length);
        let result = {
                      total: resp.hits.total,
                      count: resp.hits.hits.length,
                      items: resp.hits.hits.map((item) => {
                        var returnItem = item._source;
                        // console.log("returnItem: ", returnItem);
                        returnItem['id'] = item._id;
                        // console.log("returnItem: later ", returnItem);
                        return item._source;
                      })
        };

        callback1(undefined, result);
      }
    });
}

/**
 * Function that return all unique values of a field
 * Can be used to list filter items in the GUI
 */
function getFilterItems(index, field1, callback1) {

  var data = {
    'index': index,
    'body': {
      'aggs': {
        'result': {
          'terms': {
            'field': field1,
            'order': {
              '_term': 'asc'
            }
          }
        }
      }
    }
  };

  _client.search(data, function(err, resp) {

    if (err == null) {
      // RESULT IS LIKE [ { key: 'critical', doc_count: 33 },   { key: 'ok', doc_count: 2 } ]

      var buckets = resp.aggregations.result.buckets;
      // var res1 = [];
      var res1 = [];

      for (var i in buckets) {
        console.log("each: ", JSON.stringify(buckets[i].key));
        res1.push(buckets[i].key);
        // res1.push({"status": buckets[i].key, "counts": buckets[i].doc_count});
      }

      callback1(res1);
    } else {
      log.warn("getAggregate() _client.search() : error = " + err);
      callback1(null);
    }

  });

}

function addItem(index, data, id, callback1) {
  console.log("addItem");

  var indexDocument = {
    index: index,
    type: index,
    id: id,
    body: data
  };

  _client.index(indexDocument, function (error, response) {
    console.log("addItem: error", error);
    console.log("addItem: response", response);
    callback1(error, response);
  });

}

function stageNewFiles( id, filedata, callback1) {

  console.log("esclient::stageNewFiles filedata: ", filedata);

  let data = esIndicesConfig.hsIndices.stagedFiles;
  data.id = id;
  data.body = filedata;
  data.body.status = "unstaged";

  console.log("esclient::stageNewFiles data: ", data);

  _client.index(data, callback1);
}


function deleteItem(index, id, callback1) {
  console.log("deleteItem: id:", id);

  var indexDocument = {
    index: index,
    type: index,
    id: id
  };

  if (id) {
    console.log("deleteItem: before:");
    _client.delete(indexDocument, function (error, response) {
      console.log("addItem: error", error);
      console.log("addItem: response", response);
      callback1(error, response);
    });
  }

}


/**
 * Get the client instance of Elasticsearch
 * @param void
 */
function getESClient() {
  return _client;
}
