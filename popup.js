'use strict';

import BookmarksManager from './bookmarks.js';


chrome.tabs.query({active: true, lastFocusedWindow: true}, tabs => {
  const bookmarksManager = new BookmarksManager();
  bookmarksManager.loadBookmark(tabs[0].url).then((bookmark) => {
    new Popup().start(tabs[0], bookmarksManager, bookmark);
  });
});

class TabManager {
  static BASE = "base-tab";
  static ADD = "add-tab";
  static CREATE = "create-tab";
  static NO_BOOKMARK = "no-bookmark-tab";

  tabs = [TabManager.BASE, TabManager.ADD]
  stack = [TabManager.BASE]

  constructor(backBtn) {
    this.backBtn = backBtn;
    this.backBtn.onclick = () => {
      this.closeTab();
    }
  }

  openTab(id) {
    if (id !== TabManager.NO_BOOKMARK) {
      this.backBtn.classList.add("active")
    }
    const prev = document.getElementById(this.stack[this.stack.length-1]);
    this.stack.push(id);
    const curr = document.getElementById(id);
    this.setTabTitle(id);
    this.swapTab(prev, curr);
  }

  setTabTitle(id) {
    const titleElem = document.getElementById("tab-title");
    let title = "";
    switch(id) {
      case TabManager.ADD:
        title = "Add Label";
        break;
      case TabManager.CREATE:
        title = "Create Label";
        break;
      default:
        title = "Bookmark 2.0";
    }
    titleElem.innerText = title;
  }

  closeTab() {
    const prev = document.getElementById(this.stack.pop());
    const curr = document.getElementById(this.stack[this.stack.length-1]);
    this.setTabTitle(curr.id);
    this.swapTab(prev, curr);
    if (this.stack.length == 1) {
      this.backBtn.classList.remove("active");
    }
  }

  swapTab(prev, curr) {
    prev.classList.remove("active");
    curr.classList.add("active");
  }
}

class Popup {

  bookmark = null;
  bookmarksManager = null;
  tabManager = null;
  browserTab = null

  async start(browserTab, bookmarksManager, bookmark) {
    const backBtn = document.getElementById('back');
    const nameSpan = document.getElementById('bookmark-name');
    const urlSpan = document.getElementById('bookmark-url');
    
    this.tabManager = new TabManager(backBtn);
    this.browserTab = browserTab;
    this.bookmarksManager = bookmarksManager;
    this.bookmark = bookmark;
    this.setupBasicListeners();

    if (!this.bookmark) {
      this.tabManager.openTab(TabManager.NO_BOOKMARK);
      return;
    }
  
    let title = this.bookmark ? this.bookmark.title : this.browserTab.title;
    let url = this.bookmark ? this.bookmark.url : this.browserTab.url;
    nameSpan.innerText = title;
    urlSpan.innerText = url;
  
    this.setupAllListeners();
    this.createLabelList();
    this.createLabelSelect();
  }

  setupBasicListeners() {
    const openBtn = document.getElementById('open');
    openBtn.onclick = () => {
      chrome.tabs.create({
        active: true,
        url: 'chrome://bookmarks'
      }, null);
    }
  }

  setupAllListeners() {
    const titleInput = document.getElementById('title');
    const createBtn = document.getElementById('create');
    const goAddBtn = document.getElementById('go-add');
    const addBtn = document.getElementById('add');
    const goCreateBtn = document.getElementById('go-create');

    this.bookmarksManager.registerLabelsNotifier(this.reloadLabels.bind(this));
  
    createBtn.onclick = () => {
      const helperElem = document.getElementById("title").nextElementSibling;
      try {
        this.bookmarksManager.createLabel(titleInput.value);
        helperElem.classList.add("success");
        helperElem.innerText = "Label created";
      } catch (e) {
        helperElem.classList.remove("success");
        helperElem.innerText = e.message;
      }
    }
  
    goAddBtn.onclick = () => {
      this.tabManager.openTab(TabManager.ADD);
    }
  
    addBtn.onclick = () => {
      const select = document.getElementById("label-select");
      const helperElem = document.getElementById("label-select").nextElementSibling;
      const labelId = select.value;
      try {
        this.bookmarksManager.addLabelToBookmark(labelId, this.bookmark.id, true);
        helperElem.classList.add("success");
        helperElem.innerText = "Label added";
      } catch (e) {
        helperElem.classList.remove("success");
        helperElem.innerText = e.message;
      }
    }
  
    goCreateBtn.onclick = () => {
      this.tabManager.openTab(TabManager.CREATE);
    }
  }

  reloadLabels() {
    this.createLabelList();
    this.createLabelSelect();
  }
  
  createLabelList() {
    const labels = this.bookmarksManager.getBookmarkLabels(this.bookmark.id);
    const labelsContainer = document.getElementById("labels-list");
    labelsContainer.innerHTML = "";
    console.log(labels)
    for (let label of labels) {
      const elem = document.createElement("span");
      elem.classList.add("bookmark__label");
      elem.innerText = label;
      labelsContainer.append(elem);
    }
  }
  
  createLabelSelect() {
    const labels = this.bookmarksManager.getLabels();
    const select = document.getElementById("label-select");
    const placeholder = document.createElement("option");
    select.innerHTML = "";
    placeholder.setAttribute("selected", "true");
    placeholder.setAttribute("disabled", "true");
    placeholder.innerText = "Select a Label";
    select.append(placeholder);
    for (let labelId of Object.keys(labels)) {
      if (!labels[labelId].split(",").includes(this.bookmark.id)) {   
        const option = document.createElement("option");
        option.value = labelId;
        option.innerText = labelId;
        select.append(option);
      }
    }
  }

}
