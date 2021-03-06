'use strict';

const BOOKMARK_BAR_ID = "1";

export default class BookmarksManager {
    
    loadType = 0; // 0: all, 1: one bookmark
    labels = {};
    bookmarks = {};
    bookmarksSearchResult = null;

    labelsNotifier = null;
    bookmarksNotifier = null;

    currBookmark = null;

    constructor() {
        this.setupBookmarksListeners();
    }

    setupBookmarksListeners() {
        chrome.bookmarks.onCreated.addListener(this.onBookmarkChanges.bind(this));
        chrome.bookmarks.onChanged.addListener(this.onBookmarkChanges.bind(this));
        chrome.bookmarks.onMoved.addListener(this.onBookmarkChanges.bind(this));
        chrome.bookmarks.onRemoved.addListener(this.onBookmarkRemoved.bind(this));
        chrome.storage.onChanged.addListener(this.onLabelChanges.bind(this));
    }

    onBookmarkRemoved(changes, areaName) {
        this.removeBookmarkLabels(changes);
        delete this.bookmarks[changes];
        this.onBookmarkChanges();
    }
    
    onBookmarkChanges(changes, areaName) {
        this.loadLabels()
        .then(() => this.loadBookmarks())
        .then(() => {

            this.callBookmarksNotifier();
        })
    }

    onLabelChanges(changes, areaName) {
        if (this.loadType) {
            this.loadBookmark()
            .then(() => {
                this.callBookmarksNotifier();
                this.callLabelsNotifier();
            });
        } else {
            this.loadBookmarks()
            .then(() => {
                this.callBookmarksNotifier();
                this.callLabelsNotifier();
            });
        }
    }

    registerLabelsNotifier(notifier) {
        this.labelsNotifier = notifier;
    }

    callLabelsNotifier() {
        console.log("Labels Notifier");
        typeof this.labelsNotifier == "function" && this.labelsNotifier();
    }

    registerBookmarksNotifier(notifier) {
        this.bookmarksNotifier = notifier;
    }

    callBookmarksNotifier() {
        console.log("Bookmarks Notifier");
        typeof this.bookmarksNotifier == "function" && this.bookmarksNotifier();
    }

    loadNodeTree(node, missingBookmarks, intrinsicLabels = []) {
        const title = node.title; 
        if (!node.url) {
            if (title !== "") {
                intrinsicLabels.push(title);
            }
            for (let child of node.children) {
                this.loadNodeTree(child, missingBookmarks, [...intrinsicLabels]);
            }
        } else {
            missingBookmarks.splice(missingBookmarks.indexOf(node.id), 1);
            this.bookmarks[node.id] = {
                title: title,
                url : node.url,
                intrinsicLabels: intrinsicLabels, 
                labels: intrinsicLabels.concat(this.getBookmarkLabels(node.id))
            };
        }

    }

    loadBookmarks() {
        this.loadType = 0;
        return new Promise(resolve => {
            this.loadLabels().then(() => {
                chrome.bookmarks.getTree(nodes => {
                    const missingBookmarks = Object.keys(this.bookmarks);
                    this.loadNodeTree(nodes[0], missingBookmarks);
                    
                    // Clean removed bookmarks from labels storage
                    for (let bookmarkId of missingBookmarks) {
                        this.removeBookmarkLabels(bookmarkId)
                    } 
                    resolve();
                });
            });
        });
    }

    async loadBookmark(url) {
        this.loadType = 1;
        await this.loadLabels();
        const bookmark = await this.getBookmarkWithURL(url);
        if (bookmark) {
            if (!this.bookmarks[bookmark.id]) {
                this.bookmarks[bookmark.id] = {};
            }
            this.bookmarks[bookmark.id].title = bookmark.title;
            this.bookmarks[bookmark.id].url = bookmark.url;
            return bookmark;
        }
        return undefined;
    }

    loadLabels() {
        return new Promise(resolve => {
            chrome.storage.sync.get(null, (labels) => {
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError);
                } else {
                    this.labels = {};
                    this.bookmarks = {}
                    for (let key of Object.keys(labels)) {
                        this.labels[key] = labels[key];
                        if (labels[key] === "") {
                            continue;
                        }
                        for (let id of labels[key].split(',')) {
                            if (!this.bookmarks[id]) {
                                this.bookmarks[id] = {};
                                this.bookmarks[id].labels = []
                            } 
                            this.bookmarks[id].labels.push(key);
                        }
                    }
                    resolve();
                }
            });
        });
    }

    getLabels() {
        return this.labels;
    }

    getLabelsIds() {
        return Object.keys(this.labels);
    }

    getLabelBookmarks(name) {
        if (this.bookmarksSearchResult) {
            return this.labels[name].split(',').filter(bookmarkId => this.bookmarksSearchResult.includes(bookmarkId));
        }
        return this.labels[name].split(',').filter(bookmarkId => bookmarkId.trim().length);
    }

    verifyBookmark(url) {
        return !this.getBookmark(url);
    }

    getBookmarkWithURL(url) {
        return new Promise(resolve => {
            chrome.bookmarks.search({url}, (nodes) => {
                resolve(nodes[0]);
            });
        })
    }

    createSearch(query) {
        return new Promise(resolve => {
            chrome.bookmarks.search(query, (nodes) => {
                this.bookmarksSearchResult = nodes.map(node => node.id);
                resolve();
            });
        })
    }

    clearSearch() {
        this.bookmarksSearchResult = null;
    }

    removeBookmark

    removeBookmarkLabels(bookmarkId) {
        if (this.bookmarks[bookmarkId].labels){
            while(this.bookmarks[bookmarkId].labels.length) {
                const labelId = this.bookmarks[bookmarkId].labels[0];
                    this.removeLabelFromBookmark(labelId, bookmarkId);
            }
        }
    }

    removeLabelFromBookmark(labelId, bookmarkId) {
        if (this.labels[labelId]) { // non intrinsic labels
            const labelBookmarks = this.labels[labelId].split(',');
            labelBookmarks.splice(labelBookmarks.indexOf(bookmarkId), 1);
            this.labels[labelId] = labelBookmarks.join(',');        
            chrome.storage.sync.set({[labelId]: this.labels[labelId]}, () => {
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError);
                }
            });
        }
        this.bookmarks[bookmarkId].labels.splice(this.bookmarks[bookmarkId].labels.indexOf(labelId), 1);
    }

    getBookmarkLabels(bookmarkId) {
        if (!bookmarkId) {
            throw "Invalid Bookmark ID";
        }
        return this.bookmarks[bookmarkId]?.labels || [];
    }

    // saveBookmark(title, url) {
    //     chrome.bookmarks.create(
    //         {title, url},
    //         (newBookmark) => {
    //             console.log(newBookmark);
    //         },
    //     );
    // }

    getBookmarksIds() {
        return this.bookmarksSearchResult ? this.bookmarksSearchResult : Object.keys(this.bookmarks);
    }

    getBookmark(id) {
        return this.bookmarks[id];
    }

    getCurrentBookmark() {
        return this.currBookmark;
    }

    hasLabel(name) {
        return !!Object.values(this.labels).filter(title => title.split(',')[0] == name).length;
    }

    async addLabelToBookmark(labelId, bookmarkId, notify=false) {
        if (!this.bookmarks[bookmarkId].labels) {
            this.bookmarks[bookmarkId].labels = [];
        }
    
        this.bookmarks[bookmarkId].labels.push(labelId); 
        await this.addBookmarkToLabel(labelId, bookmarkId);
        if(notify) {
            this.callLabelsNotifier();
        }
    }

    async addBookmarkToLabel(labelId, bookmarkId) {
        const title = this.labels[labelId] = this.labels[labelId] !== "" ? this.labels[labelId] + `,${bookmarkId}` : bookmarkId;
        await chrome.storage.sync.set({[labelId]: title}, () => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
            } else {
                console.log('Bookmark added to Label');
                this.callBookmarksNotifier();
            }
        });
    }

    createBookmark(title, url) {
        return new Promise((resolve, reject) => {
            chrome.bookmarks.create({parentId: BOOKMARK_BAR_ID, title, url}, (result) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError.message);
                }
                resolve();
            });
        });
    }

    updateBookmark(id, title, url) {
        return new Promise((resolve, reject) => {
            chrome.bookmarks.update(id, {title, url}, (result) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError.message);
                }
                resolve();
            });
        });
    }

    deleteBookmark(id) {
        chrome.bookmarks.remove(id, () => {
            console.log("Bookmark Deleted");
        });
    }

    createLabel(name, callback) {
        if (this.hasLabel(name)) {
            throw Error("Label already exists");
        }
        if (!name.trim().length) {
            throw Error("Label cannot be an empty string");
        }

        chrome.storage.sync.set({[name]: ''}, () => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
            } else {
                // Notify that we saved.
                console.log('Label Created');
                this.labels[name] = '';
                typeof callback == "function" && callback(name);
            }
        });
    }

    updateLabel() {
        
    }

    removeLabel(labelName) {
        return new Promise(resolve => {
            chrome.storage.sync.remove(labelName, () => {
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        })
    }


}