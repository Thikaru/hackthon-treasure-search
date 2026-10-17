mergeInto(LibraryManager.library, {
  // Unity → Web。ページ側で window.TreasureStageNotify を用意しておく
  TS_Notify: function (ptr) {
    var msg = UTF8ToString(ptr);
    if (typeof window !== 'undefined' && typeof window.TreasureStageNotify === 'function') {
      window.TreasureStageNotify(msg);
    }
  },
});
