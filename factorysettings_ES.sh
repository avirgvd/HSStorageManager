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

