function lz(n) {
  s=""+n;
  while (s.length<2) s="0"+s;
  return s;
}

function toTime(time) {
  time=Math.floor(time/1000);
  var s = time%60;
  var m = Math.floor(time/60)%60;
  var h = Math.floor(time/60/60)%24;
  var d = Math.floor(time/60/60/24);
  var t=[d,h,m,s];
  var s=(d!=0)?(lz(d)+":"):""+lz(h)+":"+lz(m)+":"+lz(s);
  return s;
}

var _tabs = {};

function getStoredTabs() {
  var storedTabs = localStorage.getItem("tabs");
  if (!storedTabs) {
    storedTabs={};
  } else {
    storedTabs = JSON.parse(storedTabs);
  }
  return storedTabs;
}

function open(url) {
  var storedTabs = getStoredTabs();
  if (storedTabs[url]) {
    delete storedTabs[url];
  }
  localStorage.setItem("tabs", JSON.stringify(storedTabs));
  chrome.runtime.sendMessage({cmd:"open",url:url},function() {
    draw();
  });
}

function stash(tabId) {
    var tab = _tabs[tabId];
    var storedTabs = getStoredTabs();
    if (!storedTabs[tab.url]) {
      storedTabs[tab.url]={url:tab.url, title:tab.title};
    }
    localStorage.setItem("tabs", JSON.stringify(storedTabs));
    chrome.runtime.sendMessage({cmd:"stash", url:tab.url, title:tab.title});
}

function closeTab(source) {
  var cmd = source.target.innerText;
  if (cmd=="Open") {
    var url = source.target.attributes["url"].value;
    open(url);
    return;
  }
  var tabId = source.target.attributes["tabid"].value*1;
  if (cmd="Stash") {
    stash(tabId);
  }
  chrome.runtime.sendMessage({cmd:"close",tabId:tabId},function() {
    draw();
  });
}

function draw() {
  chrome.runtime.sendMessage({cmd:"tabsStats"},function(response) {
    var tabs = [];
    _tabs=response;
    for (var prop in response) {
      var obj = response[prop];
      obj.id=prop;
      tabs.push(obj);
    };
    tabs.sort(function(a,b) {
      var _a=a.hTime/a.time;
      var _b=b.hTime/b.time;
      return _b-_a;
    });
    var content = "<h3>Active tabs ("+tabs.length+")</h3><table style='font-size:small'><tr><th>Open</th><th>Active</th><th>Title</th><th>URL</th><th>Actions</th></tr>";
    for (var i=0; i<tabs.length; i++) {
      var tab=tabs[i];
      var url = tab.url;
      var title = tab.title;
      var openTime = new Date().getTime()-tab.time;
      var spendTime = tab.hTime;
      var color=i%2==0?"lightgray":"white";
      var s = "<tr bgcolor='"+color+"' valign='top'><td>"+toTime(openTime)+"</td><td>"+toTime(spendTime)+"</td><td>"+title+"</td><td>"+url+"</td><td><a tabid="+tab.id+" href='#'>Close</a>&nbsp;<a tabid="+tab.id+" href='#'>Stash</a></td></tr>";
      content+=s;
    }
    content+="</table>"
    var storedTabs = getStoredTabs();
    tabs = [];
    for (var prop in storedTabs) {
      tabs.push(storedTabs[prop]);
    }
    if (tabs.length>0) {
      content+="<h3>Stashed tabs ("+tabs.length+")</h3>";
      content+="<table valign='top' style='font-size:small'><tr><th>Title</th><th>URL</th><th>Action</th></tr>";
      for (var i=0; i<tabs.length; i++) {
        var tab = tabs[tabs.length-i-1];
        var color=i%2==0?"lightgray":"white";
        content+="<tr bgcolor='"+color+"'><td>"+tab.title+"</td><td>"+tab.url+"</td><td><a href='#' url='"+tab.url+"'>Open</a></td></tr>";
      }
      content+="</table>";
    }
    document.getElementById("content").innerHTML=content;
    var tags=document.getElementsByTagName("a");
    for (var i=0; i<tags.length; i++) {
      tags[i].onclick=closeTab;
    }
  });
};

draw();
