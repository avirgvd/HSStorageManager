#!/usr/bash

# This script populates Elastic search with indexes for storage containers and OSDs


curl -XPOST localhost:9200/sm_osdindex/_bulk -d '
{"index": {"_index": "sm_osdindex", "_type": "sm_osdindex", "_id": "localhdd1"}}
{ "id": "localhdd1", "protocol": "file", "device-id": "", "device-type": "localHDD", "credentials": {}, "permission": "rw","path": "/home/govind/HomeServer/LOCALSTORAGE"}
{"index": {"_index": "sm_osdindex", "_type": "sm_osdindex", "_id": "localhdd2"}}
{ "id": "localhdd2", "protocol": "file", "device-id": "", "device-type": "localHDD", "credentials": {}, "permission": "rw", "path": "/home/govind/HomeServer/LOCALSTORAGE2"}
{"index": {"_index": "sm_osdindex", "_type": "sm_osdindex", "_id": "localsdd1"}}
{ "id": "localsdd1", "protocol": "file", "description": "For file cache and thumbnails", "device-id": "", "device-type": "localSDD", "credentials": {}, "permission": "rw", "path": "/home/govind/HomeServer/LOCALSDD"}
{"index": {"_index": "sm_osdindex", "_type": "sm_osdindex", "_id": "google-drive"}}
{ "id": "google-drive", "protocol": "url", "description": "For tier-2 user files", "device-id": "", "device-type": "cloud", "credentials": {}, "permission": "rw", "path": ""}
{"index": {"_index": "sm_osdindex", "_type": "sm_osdindex", "_id": "cloud-s3"}}
{ "id": "cloud-s3", "protocol": "url", "description": "For tier-2 user files", "device-id": "", "device-type": "cloud", "credentials": {}, "permission": "rw", "path": ""}
{"index": {"_index": "sm_osdindex", "_type": "sm_osdindex", "_id": "usb"}}
{ "id": "usb", "protocol": "file", "description": "Backup or tier-2 user files", "device-id": "", "device-type": "USB-mass-storage", "credentials": {}, "permission": "rw", "path": ""}
{"index": {"_index": "sm_osdindex", "_type": "sm_oscontainersindex", "_id": "nfs"}}
{ "id": "nfs", "protocol": "nfs", "description": "Backup or tier-2 user files", "device-id": "", "device-type": "For tier-3 user content", "credentials": {}, "permission": "rw", "path": ""}
'


curl -XPOST localhost:9200/sm_oscontainersindex/_bulk -d '
{"index": {"_index": "sm_oscontainersindex", "_type": "sm_oscontainersindex", "_id": "media1"}}
{"id":"media1",  "policyJSON": {}, "osds": ["localhdd1", "localhdd2"], "description": "For tier-1 user files", "basepath": "/media1", "bucketcategory": "media"}
{"index": {"_index": "sm_oscontainersindex", "_type": "sm_oscontainersindex", "_id": "media-old"}}
{"id":"media-old",  "policyJSON": {}, "osds": ["google-drive"], "description": "For tier-2 user files", "basepath": "/media-old", "bucketcategory": "media"}
{"index": {"_index": "sm_oscontainersindex", "_type": "sm_oscontainersindex", "_id": "backup"}}
{"id":"backup",  "policyJSON": {}, "osds": ["usb"], "description": "For backup", "basepath": "/backup", "bucketcategory": "backup"}
{"index": {"_index": "sm_oscontainersindex", "_type": "sm_oscontainersindex", "_id": "thumbnails"}}
{"id":"thumbnails",  "policyJSON": {}, "osds": ["localsdd1"], "description": "For tthumbnails for images, videos and PDFs", "basepath": "/thumbnails", "bucketcategory": "thumbnails"}
{"index": {"_index": "sm_oscontainersindex", "_type": "sm_oscontainersindex", "_id": "docs"}}
{"id":"docs",  "policyJSON": {}, "osds": ["localhdd1", "localhdd2"], "description": "For tier-1 user files", "basepath": "/docs", "bucketcategory": "docs"}
{"index": {"_index": "sm_oscontainersindex", "_type": "sm_oscontainersindex", "_id": "docs-old"}}
{"id":"docs-old",  "policyJSON": {}, "osds": ["localhdd1", "localhdd2"], "description": "For tier-2 user files", "basepath": "/docs-old", "bucketcategory": "docs"}
{"index": {"_index": "sm_oscontainersindex", "_type": "sm_oscontainersindex", "_id": "system"}}
{"id":"system",  "policyJSON": {}, "osds": ["localhdd1", "localhdd2"], "description": "For system files", "basepath": "/system", "bucketcategory": "system"}
{"index": {"_index": "sm_oscontainersindex", "_type": "sm_oscontainersindex", "_id": "system-cache"}}
{"id":"system-cache",  "policyJSON": {}, "osds": ["localsdd1"], "description": "For system files", "basepath": "/system-cache", "bucketcategory": "cache"}
{"index": {"_index": "sm_oscontainersindex", "_type": "sm_oscontainersindex", "_id": "staging"}}
{"id":"staging",  "policyJSON": {}, "osds": ["localsdd1"], "description": "Bucket for staging newly added file", "basepath": "/staging", "bucketcategory": "staging"}
'

curl -XPOST localhost:9200/sm_objectstoreindex_system/_bulk -d '
{"index": {"_index": "sm_objectstoreindex_system", "_type": "sm_objectstoreindex_system", "_id": "contacts.png"}}
{"id":"contacts.png",  "path": "localsdd1:/system/contacts.png", "size": "22856", "mimetype": "image/png"}
{"index": {"_index": "sm_objectstoreindex_system", "_type": "sm_objectstoreindex_system", "_id": "DigitalLibrary.png"}}
{"id":"DigitalLibrary.png",  "path": "localsdd1:/system/DigitalLibrary.png", "size": "318405", "mimetype": "image/png"}
{"index": {"_index": "sm_objectstoreindex_system", "_type": "sm_objectstoreindex_system", "_id": "Financials.png"}}
{"id":"Financials.png",  "path": "localsdd1:/system/Financials.png", "size": "65731", "mimetype": "image/png"}
{"index": {"_index": "sm_objectstoreindex_system", "_type": "sm_objectstoreindex_system", "_id": "medical_records.png"}}
{"id":"medical_records.png",  "path": "localsdd1:/system/medical_records.png", "size": "17080", "mimetype": "image/png"}
{"index": {"_index": "sm_objectstoreindex_system", "_type": "sm_objectstoreindex_system", "_id": "photos.png"}}
{"id":"photos.png",  "path": "localsdd1:/system/photos.png", "size": "3376", "mimetype": "image/png"}
{"index": {"_index": "sm_objectstoreindex_system", "_type": "sm_objectstoreindex_system", "_id": "Music.jpg"}}
{"id":"Music.jpg",  "path": "localsdd1:/system/Music.jpg", "size": "7661", "mimetype": "image/jpeg"}
{"index": {"_index": "sm_objectstoreindex_system", "_type": "sm_objectstoreindex_system", "_id": "Videos.jpg"}}
{"id":"Videos.jpg",  "path": "localsdd1:/system/Videos.jpg", "size": "5376", "mimetype": "image/jpeg"}
{"index": {"_index": "sm_objectstoreindex_system", "_type": "sm_objectstoreindex_system", "_id": "travel.jpg"}}
{"id":"travel.jpg",  "path": "localsdd1:/system/travel.jpg", "size": "8925", "mimetype": "image/jpeg"}
{"index": {"_index": "sm_objectstoreindex_system", "_type": "sm_objectstoreindex_system", "_id": "Assets.jpg"}}
{"id":"Assets.jpg",  "path": "localsdd1:/system/Assets.jpg", "size": "13585", "mimetype": "image/jpeg"}
{"index": {"_index": "sm_objectstoreindex_system", "_type": "sm_objectstoreindex_system", "_id": "Unknown.jpg"}}
{"id":"Unknown.jpg",  "path": "localsdd1:/system/Unknown.jpg", "size": "4705", "mimetype": "image/jpeg"}
{"index": {"_index": "sm_objectstoreindex_system", "_type": "sm_objectstoreindex_system", "_id": "Settings.png"}}
{"id":"Settings.png",  "path": "localsdd1:/system/Settings.png", "size": "67916", "mimetype": "image/png"}
'

