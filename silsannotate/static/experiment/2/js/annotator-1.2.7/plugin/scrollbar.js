// This is now a constructor and needs to be called with `new`.
Annotator.Plugin.Scrollbar = function (element, options) {

  // Call the Annotator.Plugin constructor this sets up the .element and
  // .options properties.
  Annotator.Plugin.apply(this, arguments);

  // Set up the rest of your plugin.
};

// Set the plugin prototype. This gives us all of the Annotator.Plugin methods.
Annotator.Plugin.Scrollbar.prototype = new Annotator.Plugin();

// Now add your own custom methods.
Annotator.Plugin.Scrollbar.prototype.pluginInit = function () {
  // Do something here.
};