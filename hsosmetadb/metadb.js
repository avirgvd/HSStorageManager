/**
 * Created by govind on 2/19/17.
 */

var esclient = require('../elasticsearch/esclient');

//Each container has its own namespace
//So a file with same name can exist in more than one container
var OBJECT_STORE_CONTAINERS = [
            'CACHE', // Frequently access content will be placed in this container. Yet to decide on algo for caching
            'THUMBNAILS', // Thumbnails for frequently and recently accessed images and videos. The total size of this storage will be limited using configurable size
            'PERSISTENT_STORAGE', // Container for the actual user content files
            'BACKUP', // The files from the backup. These files are not exact duplication of original. The files will be compressed in this container
            'SYSTEM' // System files like logo's configuration files etc
          ];


var persistentStoragePolicy = {
  STAGING_AREA: "yes",
  OSD: "localdisks"
};

var cachePolicy = {
  STAGING_AREA: "no",
  OSD: "ssd"
};

var thumbnailsPolicy = {
  STAGING_AREA: "no",
  OSD: "ssd",
  THUMBNAIL_SIZE: 244, // This is factory setting, Can be modified by using System settings
  CLEANUP_POLICY: 'accesstime',
  STORAGE_LIMIT_GB: 2 // This is factory setting, Can be modified by using System settings
};

var systemPolicy = {
  STAGING_AREA: "no",
  PRIMARY_OSD: "localdisk", // This is original copy that comes with system. Invisible to external access
  ACTIVE_OSD: "ssd", // this OSD syncs with Primary and all reads will be from this OSD
  STORAGE_LIMIT_GB: 2 // This is factory setting, Can be modified by using System settings
};


var MetaDB = {




};

module.exports = MetaDB;