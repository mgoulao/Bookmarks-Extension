
'use strict';

import BookmarksManager from "./bookmarks.js";
import Components from "./components.js";
import Icons from "./icons.js";

class App {

    overlays = {
        CHANGE: 'add-label',
        LABEL_MANAGER: 'label-manager',
        EDIT: 'edit-bookmark',
        ABOUT: 'about',
        CREATE: 'create-bookmark',
    }
    overlaysTitles = {
        [this.overlays.CHANGE]: "Edit Bookmark's Labels",
        [this.overlays.LABEL_MANAGER]: "Manage Labels",
        [this.overlays.EDIT]: "Edit Bookmark",
        [this.overlays.ABOUT]: "About",
        [this.overlays.CREATE]: "Create bookmark",
    }

    selectedLabels = [];
    displayBookmarks = [];

    labelManagerActive = false;

    overlayElems = [];
    currOverlayElem = null;
    overlayChangeListener = null;

    currEditBookmarkId = null;

    menuContext = {
        bookmarkId: null,
    }

    constructor(bookmarkManager) {
        this.bookmarkManager = bookmarkManager;
        this.bookmarkManager.registerLabelsNotifier(this.labelsNotifier.bind(this));
        this.bookmarkManager.registerBookmarksNotifier(this.bookmarksNotifier.bind(this));
        
        this.setupListeners();
        this.createBookmarkList();
        this.createFiltersLists();
        this.setupHeaderMore();
        this.setupSearch();
        this.createOverlay();
        this.setupLabelManager();
        this.createOptionsMenu();
        this.createEditBookmark();
        this.createCreateBookmark();
    }

    setupListeners() {
        const createBtn = document.getElementById("create-bookmark-btn");
        
        document.addEventListener("contextmenu", (e) => {
            const bookmarkId = this.getClickedBookmarkId(e);
            if (bookmarkId) {
                e.preventDefault();
                this.openOptionsMenu(e, bookmarkId, false);
            }
        });

        createBtn.onclick = this.openCreateBookmark.bind(this);
    }

    getClickedBookmarkId(e) {
        var el = e.srcElement || e.target;
      
        if (el.classList.contains("bookmark")) {
            return el.id.split("-")[1];
        } else {
            while ( el = el.parentNode ) {
                if ( el.classList && el.classList.contains("bookmark") ) {
                    console.log(el);
                    return el.id.split("-")[1];
                }
          }
        }
      
        return false;
      }

    refreshUI() {
        this.createBookmarkList();
        this.createFiltersLists();
    }

    labelsNotifier() {
        this.createFiltersLists();
    }

    bookmarksNotifier() {
        this.createBookmarkList();
        typeof this.overlayChangeListener == "function" && this.overlayChangeListener();
    }

    createOptionsMenu() {
        const menu = document.getElementById("options-menu");
        const deleteB = document.getElementById("menu-delete-bookmark");
        const edit = document.getElementById("menu-edit-bookmark");
        const copyUrl = document.getElementById("menu-copy-url");
        const openTab = document.getElementById("menu-open-tab");
        const openWindow = document.getElementById("menu-open-window");
        const openIncognito = document.getElementById("menu-open-incognito");

        deleteB.onclick = () => {
            if(confirm("Do you want do delete this bookmark?")) {
                this.bookmarkManager.deleteBookmark(this.menuContext.bookmarkId);
            }
        }  

        edit.onclick = () => {
            // Open Edit
            this.openEditBookmark(this.menuContext.bookmarkId);
        }

        copyUrl.onclick = () => {
            const copyInput = document.getElementById("copyUrlInput");
            copyInput.select();
            document.execCommand('copy');
            this.openNotification('URL copied!');
        }

        openTab.onclick = () => {
            chrome.tabs.create({"url": this.bookmarkManager.getBookmark(this.menuContext.bookmarkId).url});
        }

        openWindow.onclick = () => {
            chrome.windows.create({"url": this.bookmarkManager.getBookmark(this.menuContext.bookmarkId).url});

        }

        openIncognito.onclick = () => {
            chrome.windows.create({"url": this.bookmarkManager.getBookmark(this.menuContext.bookmarkId).url, "incognito": true});
        }

        window.addEventListener("click", (e) => {
            if (menu.classList.contains("active")) {
                e.preventDefault();
                menu.classList.remove("active");
            }
        });
        menu.onclick = (e) => {
            e.stopPropagation();
        }
        
    }

    openMenu(e, menu, target=true) {
        const originX = target ? e.target.offsetLeft+5 : e.x;
        const originY = target ? e.target.offsetTop+30 : e.y + window.scrollY;
        e.stopPropagation();
        menu.classList.add("active");
        menu.style.left = `${Math.min(originX, document.body.offsetWidth - menu.offsetWidth - 10)}px`;
        menu.style.top = `${Math.min(originY, (window.scrollY + window.innerHeight - menu.offsetHeight - 10))}px`;
    }

    openOptionsMenu(e, bookmarkId, target=true) {
        const menu = document.getElementById("options-menu");
        this.menuContext.bookmarkId = bookmarkId;
        this.openMenu(e, menu, target);
    }

    openHeaderMenu(e) {
        const menu = document.getElementById("header-more-menu");
       this.openMenu(e, menu);
    }

    createOverlay() {
        const overlayElem = document.getElementsByClassName("overlay")[0];
        const closeBtn = document.getElementById("overlay__close-btn");
        closeBtn.onclick = this.closeOverlay.bind(this);
    }

    closeOverlay() {
        const overlayElem = document.getElementsByClassName("overlay")[0];
        overlayElem.classList.remove("active");
        this.currOverlayElem.classList.remove("active");
        this.overlayChangeListener = null;
    }

    openOverlay(elemId) {
        const overlayElem = document.getElementsByClassName("overlay")[0];
        const overlayTitleElem = document.getElementsByClassName("overlay__title")[0];
        const currElem = document.getElementById(elemId);
        overlayElem.classList.add("active");
        currElem.classList.add("active");
        overlayTitleElem.innerText = this.overlaysTitles[elemId];
        this.currOverlayElem = currElem;
    }

    openEditBookmark(bookmarkId) {
        const titleInput = document.getElementById("bookmark-title-input");
        const urlInput = document.getElementById("bookmark-url-input");
        const bookmark = this.bookmarkManager.getBookmark(bookmarkId);

        titleInput.value = bookmark.title;
        urlInput.value = bookmark.url;

        this.openOverlay(this.overlays.EDIT);
        this.currEditBookmarkId = bookmarkId;
    }

    createEditBookmark() {
        const updateBtn = document.getElementById("bookmark-update-btn");
        const titleInput = document.getElementById("bookmark-title-input");
        const urlInput = document.getElementById("bookmark-url-input");

        updateBtn.onclick = () => {
            if (titleInput.value && urlInput.value) {
                this.bookmarkManager.updateBookmark(this.currEditBookmarkId, titleInput.value, urlInput.value).then(() => {
                    this.closeOverlay();
                    urlInput.nextElementSibling.innerHTML = "";
                    this.openNotification("The bookmark was updated successfully");
                }).catch(message => {
                    urlInput.nextElementSibling.innerHTML = message;
                });
            }
            else {
                urlInput.nextElementSibling.innerHTML = "Empty fields";
            } 
        }
    }

    openCreateBookmark() {
        this.openOverlay(this.overlays.CREATE);
    }

    createCreateBookmark() {
        const updateBtn = document.getElementById("bookmark-create-btn");
        const titleInput = document.getElementById("bookmark-create-title-input");
        const urlInput = document.getElementById("bookmark-create-url-input");

        updateBtn.onclick = () => {
            if (titleInput.value && urlInput.value) {
                this.bookmarkManager.createBookmark(titleInput.value, urlInput.value).then(() => {
                    this.closeOverlay();
                    urlInput.nextElementSibling.innerHTML = "";
                    this.openNotification("The bookmark was create successfully");
                }).catch(message => {
                    urlInput.nextElementSibling.innerHTML = message;
                });
            }
            else {
                urlInput.nextElementSibling.innerHTML = "Empty fields";
            } 
        }
    }

    openLabelManager() {
        this.openOverlay(this.overlays.LABEL_MANAGER);

        this.overlayChangeListener = this.createLabelManager;
        this.createLabelManager();
    }

    removeLabel(labelName) {
        if (confirm("Are you sure?")) {
            this.bookmarkManager.removeLabel(labelName).then(() => {
                this.openLabelManager();
                this.openNotification('The label was deleted successfully');
            });
        }
    }

    setupLabelManager() {
        const btn = document.getElementById("manage-label-btn");
        btn.onclick = this.openLabelManager.bind(this);

        const saveBtn = document.getElementById('save');
        const titleInput = document.getElementById('title');
        saveBtn.onclick = () => {
            if (titleInput.value !== "") {
                this.bookmarkManager.createLabel(titleInput.value, () => {    
                    this.openLabelManager();
                    this.createFiltersLists();
                    this.clo
                });
            }
        }
    }

    createLabelManager() {
        const overlayList = document.getElementById("label-manager-list");

        while (overlayList.firstChild) {
            overlayList.removeChild(overlayList.lastChild);
        }

        const labels = this.bookmarkManager.getLabels();
        for (let label of Object.keys(labels)) {        
            const labelElemContainer = document.createElement("div");
            labelElemContainer.classList.add("overlay__item");
            overlayList.append(labelElemContainer);
            const btn = Components.IconButton(Icons.CLOSE);
            const labelElem = Components.LabelWithButton(label, btn);
            btn.onclick = () => {
                this.removeLabel(label);
            }
            labelElemContainer.append(labelElem);
        }
    }

    createChangeLabels(bookmarkId) {
        const removeLabelList = document.getElementById("remove-label-list");
        const addLabelList = document.getElementById("add-label-list");

        while (addLabelList.firstChild) {
            addLabelList.removeChild(addLabelList.lastChild);
        }
        while (removeLabelList.firstChild) {
            removeLabelList.removeChild(removeLabelList.lastChild);
        }

        const labels = this.bookmarkManager.getLabels();
        for (let labelId of Object.keys(labels)) {
            if (labels[labelId].split(",").includes(bookmarkId)) {   
                const item = document.createElement("div");
                item.classList.add("overlay__item");
                removeLabelList.append(item);
                const btn = Components.IconButton(Icons.CLOSE);
                const labelWithBtn = Components.LabelWithButton(labelId, btn);
                btn.onclick = () => {
                    this.bookmarkManager.removeLabelFromBookmark(labelId, bookmarkId);
                }
                item.append(labelWithBtn);
            } else {
                const item = document.createElement("div");
                item.classList.add("overlay__item");
                addLabelList.append(item);
                const btn = Components.IconButton(Icons.ADD);
                const labelWithBtn = Components.LabelWithButton(labelId, btn);
                btn.onclick = () => {
                    this.bookmarkManager.addLabelToBookmark(labelId, bookmarkId);
                }
                item.append(labelWithBtn);
            }
        }

    }

    openChangeLabels(bookmarkId) {
        this.openOverlay(this.overlays.CHANGE);
        this.overlayChangeListener = () => {this.createChangeLabels(bookmarkId)};
        this.createChangeLabels(bookmarkId);
    }

    openAbout() {
        this.openOverlay(this.overlays.ABOUT);
    }

    setupHeaderMore() {
        const moreBtn = document.getElementById("header-more");
        const menuElem = document.getElementById("header-more-menu");
        const aboutOption  = document.getElementById("header-menu-about");
        window.addEventListener("click", (e) => {
            if (menuElem.classList.contains("active")) {
                e.preventDefault();
                menuElem.classList.remove("active");
            }
        });
        moreBtn.onclick = this.openHeaderMenu.bind(this);
        aboutOption.onclick = this.openAbout.bind(this);
    }

    setupSearch() {
        const searchInput = document.getElementById('search-query');
        searchInput.onkeyup = () => {
            if (searchInput.value === "") {
                this.bookmarkManager.clearSearch();
            } else {
                this.bookmarkManager.createSearch(searchInput.value).then(() => {
                    this.createBookmarkList();
                });
            }
        }
    }

    getFilteredList() {
        let bookmarksIds = [];
        if (this.selectedLabels.length) {
            for (let label of this.selectedLabels) {
                const labelBookmarks = this.bookmarkManager.getLabelBookmarks(label);
                if (labelBookmarks.length && !bookmarksIds.length) {
                        bookmarksIds = labelBookmarks;
                }
                bookmarksIds = bookmarksIds.filter(bookmarkId => labelBookmarks.includes(bookmarkId));
            }
        } else {
            bookmarksIds = this.bookmarkManager.getBookmarksIds();
        }
        return bookmarksIds;
    }

    createBookmarkList() {
        const containerElem = document.getElementById("bookmark-list");
        while (containerElem.hasChildNodes()) {
            containerElem.removeChild(containerElem.lastChild);
        }
        const bookmarksIds = this.getFilteredList();
        if (bookmarksIds.length) {
            for (let id of bookmarksIds) {
                const bookmark = this.bookmarkManager.getBookmark(id);
                if (bookmark) {
                    const link = document.createElement("a");
                    link.setAttribute("href", bookmark.url);
                    link.setAttribute("target", "_blank");
                    link.setAttribute("rel", "noopener noreferrer");
                    containerElem.append(link);
                    const itemElem = document.createElement("div");
                    itemElem.classList.add("bookmark");
                    itemElem.setAttribute("id", `bookmark-${id}`);
                    link.append(itemElem);
                    const leftDiv = document.createElement("div");
                    leftDiv.classList.add("bookmark__left");
                    itemElem.append(leftDiv);
                    const titleSpan = document.createElement("span");
                    titleSpan.classList.add("bookmark__title");
                    titleSpan.innerText = bookmark.title;
                    leftDiv.append(titleSpan);
                    const labelsElem = document.createElement("div");
                    labelsElem.classList.add("bookmark__labels-container");
                    leftDiv.append(labelsElem);
                    for (let label of bookmark.labels) {
                        const labelElem = document.createElement("span");
                        labelElem.classList.add("bookmark__label");
                        labelElem.innerText = label;
                        labelsElem.append(labelElem);
                    }
                    const rightDiv = document.createElement("div");
                    rightDiv.classList.add("bookmark__right");
                    itemElem.append(rightDiv);
                    const addBtn = Components.BasicButton("Edit Labels");
                    addBtn.classList.add("bookmark__add-label");
                    addBtn.onclick = (e) => {
                        e.preventDefault();
                        this.openChangeLabels(id);
                    }
                    rightDiv.append(addBtn);
                    const moreBtn = Components.IconButton(Icons.MORE);
                    moreBtn.classList.add("bookmark__more")
                    moreBtn.onclick = (e) => {
                        e.preventDefault();
                        const copyInput = document.getElementById("copyUrlInput");
                        copyInput.value = bookmark.url;
                        this.openOptionsMenu(e, id);
                    }
                    rightDiv.append(moreBtn);
                }
            }
        } else {
            const noResultcontainerElem = document.createElement("div");
            noResultcontainerElem.classList.add("no-bookmark__container");
            const span = document.createElement("span");
            span.innerText = "No results were found";
            span.classList.add("no-bookmark__message");
            noResultcontainerElem.append(span);
            containerElem.append(noResultcontainerElem);
        }
    }

    updateFilterLabels(label, checked) {
        if (checked) {
            if (!(this.selectedLabels.includes(label))) {
                this.selectedLabels.push(label);
            }
        } else if (this.selectedLabels.includes(label)) {
            this.selectedLabels.splice(this.selectedLabels.indexOf(label), 1);
        }
        this.createBookmarkList();
    }

    createFiltersLists() {
        const ul = document.getElementById('filters-labels-list');
        const labels = this.bookmarkManager.getLabels();
        const intrinsicLabels = this.bookmarkManager.getIntrinsicLabels();
        while (ul.firstChild) {
            ul.removeChild(ul.lastChild);
        }
        for (let label of Object.keys(labels).concat(Object.keys(intrinsicLabels))) {
            const li = document.createElement("li");
            ul.append(li);
            const container = Components.LabeledCheckbox(label,  (e) => {this.updateFilterLabels(label, e.target.checked)});
            li.append(container);            
        }

    }

    openNotification(message) {
        const notificationElem = document.getElementsByClassName('notification')[0]
        const notificationMessElem = document.getElementsByClassName('notification__message')[0];
        notificationMessElem.innerText = message;
        notificationElem.classList.add('active');
        setTimeout(() => {
            notificationElem.classList.remove('active');
            notificationMessElem.innerText = '';
        }, 5000);
    }

}

window.onload = () => {
    const bookmarkManager = new BookmarksManager()
    bookmarkManager.loadBookmarks().then(() => {
        new App(bookmarkManager);
    });
}
