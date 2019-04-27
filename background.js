var urls = {};
var higlightedTabId;
var higlightingStartTime;

var stashFolder = localStorage.getItem("stashFolderId");

function createStashFolder() {
  chrome.bookmarks.create({'title': "Stashed links"},
                          function(newFolder) {
    stashFolder = newFolder.id;
    localStorage.setItem("stashFolderId", stashFolder);
  });
}

if (!stashFolder) {
  createStashFolder();
} else {
  chrome.bookmarks.get(stashFolder, function(bookmarks) {
    if (!bookmarks) {
      createStashFolder();
    }
  });
}

chrome.tabs.query({}, function(tabs) {
  for (var i=0; i<tabs.length; i++) {
    var tab = tabs[i];
    if (tab.active) {
      higlightedTabId=tab.id;
      higlightingStartTime=new Date().getTime();
    }
    if (!urls[tab.id]) {
      urls[tab.id]={url:tab.url,title:tab.title,time:new Date().getTime(),hTime:0};
    }
  }
});

function update() {
  chrome.tabs.query({},function(tabs) {
    var number = tabs.length;
    chrome.browserAction.setBadgeText({text:""+number});
    }
  );
}

function addEvent(event, tab, tabId) {
  if (tabId) {
    var url = urls[tabId];
    delete urls[tabId];
  } else {
    var urlInfo = urls[tab.id];
    if (!urlInfo) {
      urls[tab.id]={url:tab.url,title:tab.title,time:new Date().getTime(),hTime:0};
    } else {
      var oldUrl = urlInfo.url;
      if (tab.url!=oldUrl) {
        urls[tab.id]={url:tab.url,title:tab.title,time:new Date().getTime(),hTime:0};
      }
    }
    urls[tab.id].title=tab.title;
    //console.log(event+" "+tab.url+" "+tab.title);
  }
}

chrome.tabs.onCreated.addListener(function(tab) {
  update();
  addEvent("created",tab);
});

chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
  update();
  var tab;
  addEvent("removed", tab, tabId);
});


chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  chrome.tabs.get(tabId, function(tab) {
    addEvent("updated",tab);
  });
});

chrome.tabs.onActivated.addListener(function(activeInfo) {
  if (higlightedTabId) {
    var urlInfo=urls[higlightedTabId];
    if (urlInfo) {
      var delta = new Date().getTime()-higlightingStartTime;
      if (!urlInfo.hTime) urlInfo.hTime=0;
      urlInfo.hTime+=delta;
    }
  }
  higlightedTabId=activeInfo.tabId;
  higlightingStartTime=new Date().getTime();
  chrome.tabs.get(activeInfo.tabId, function(tab) {
    addEvent("activated",tab);
  });
});

chrome.tabs.onHighlighted.addListener(function(highlightInfo) {

  for (var i=0; i<highlightInfo.tabIds.length; i++) {
    var tabId = highlightInfo.tabIds[i];
    chrome.tabs.get(tabId, function(tab) {
      addEvent("higlighted",tab);
    });
  }
});

chrome.tabs.onReplaced.addListener(function(addedTabId, removedTabId) {
  chrome.tabs.get(addedTabId.tabId.tabId, function(tab) {
    addEvent("replaced",tab);
  });
});

chrome.runtime.onMessage.addListener(function(message,sender,sendResponse) {
  if (message.cmd=="tabsStats") {
    if (higlightedTabId) {
      var urlInfo=urls[higlightedTabId];
      if (urlInfo) {
        var delta = new Date().getTime()-higlightingStartTime;
        if (!urlInfo.hTime) urlInfo.hTime=0;
        urlInfo.hTime+=delta;
      }
    }
    higlightingStartTime=new Date().getTime();
    sendResponse(urls);
  }
  if (message.cmd=="close") {
    chrome.tabs.remove(message.tabId);
    sendResponse();
  }
  if (message.cmd=="open") {
    var url = message.url;
    chrome.tabs.create({url:url});
    sendResponse();
  }
  if (message.cmd=="stash") {
    var url = message.url;
    var title = message.title;
    chrome.bookmarks.search({url:url}, function(bookmarks) {
      if (!bookmarks) bookmarks=[];
      if (bookmarks.length==0 || (bookmarks.length>0 && bookmarks[0].parentId*1!=stashFolder*1)) {
        chrome.bookmarks.create({title: title, parentId: stashFolder, url:url}, function(newLink) {

        });
      }
    });
  }
});

update();
