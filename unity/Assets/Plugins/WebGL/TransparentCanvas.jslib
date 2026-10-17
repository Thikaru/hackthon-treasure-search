// Unity は毎フレームの最後に「アルファだけを 1 で塗る」クリアをして、キャンバスを不透明にする。
// Web 版の写真背景を透かして見せたいので、そのアルファだけのクリアを飛ばす。
mergeInto(LibraryManager.library, {
  glClear: function (mask) {
    if (mask == 0x00004000) {
      var w = GLctx.getParameter(GLctx.COLOR_WRITEMASK);
      if (!w[0] && !w[1] && !w[2] && w[3]) return;
    }
    GLctx.clear(mask);
  },
});
