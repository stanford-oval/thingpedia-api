2.10.0-alpha.6
==============

* Added support for resolving entities from the developer directory [#213].
* Added sqlite-based caching of parameter datasets [#213].
* Updated dependencies [#214].
* Added new confidence level for dialogue handlers, intermediate between
  exact and normal [#215].

2.10.0-alpha.5
==============

* Added a timeout to HTTP requests [#207].
* Fixed signature of polling functions [#204].

2.10.0-alpha.4
==============

* Fix monitoring of classes that use abstract interfaces, and classes
  that use async-iterable queries [#203].
* Added support for translated manifests in developer directories [#203].
* Removed translation support for builtins. Builtins should be translated
  ahead of time by the app code [#203].

2.10.0-alpha.3
==============

* Fixed translation of builtin devices with recent Genie [#201].
* Updated dependencies [#184, #191, #194, #198, #199, #200].

2.10.0-alpha.2
==============

* Updated BaseClient interfaces to support entity inheritance [#169].
* Added new confidence levels for dialogue handlers that use template matching [#171].
* Improved documentation [#168].
* Updated dependencies [#166, #167, #181, #182, #183].

2.10.0-alpha.1
==============

* Added new interfaces and capabilities that devices and platforms can expose [#155, #162]:
  - custom notification backends
  - dialogue handlers to dispatch commands to non-ThingTalk backends
* Added the ability to load secrets.json in development mode [#161].
* Queries with no authentication are now proxied through Thingpedia if API keys
  are missing [#161].
* Added support for OAuth 2.0 PKCE. When supported by the server, this avoids the
  need for client secrets [#161, #164].
* Gettext support is now always available for all devices [#163].
* Updated dependencies [#154, #156, #157, #158, #159, #160]

2.9.0
=====

* Added VAD platform capability [#153].

Please see the previous releases for the full list of changes in this
development cycle.

Contributors to this release:
- Antonio Muratore

2.9.0-beta.1
============

* Add client APIs to search devices in Thingpedia [#137].
* Added MemoryPreferences class, to complement FilePreferences [#138].
* Added platform APIs to get and set the user profile [#142].
* Expanded type definitions for interfaces used by the API, including more
  capability interfaces [#139].
* Restored and updated documentation [#140].
* Updated dependencies [#141, #143, #144, #145, #146, #147, #148, #149, #150,
  #151, #152].

2.9.0-alpha.3
=============

* The caching logic for downloading skills was made simpler and more robust
  to repeated checks for updates, at a small cost in performance [#135].
* Query functions are now allowed to be implemented as async iterable functions
  (`async *get_foo`) instead of async functions that return a regular iterable.
  This allows easily implementing lazy queries that return as many results as
  needed by ThingTalk code [#83].
* Misc build system fixes [#127].

2.9.0-alpha.2
=============

* The minimum supported version of node is now 12.* [#126].
* Misc type definition fixes [#125].
* Update dependencies [#110, #111, #112, #113, #114, #119, #124].

2.9.0-alpha.1
=============

* This is the first version of the Thingpedia SDK to support ThingTalk 2.0 [#106].
* The library was partially rewritten in TypeScript. All major public interfaces
  now are typed, and we expect the rewrite will continue over the course of the
  2.9.0 development cycle [#100, #104].
* The preferred package manager is now NPM instead of Yarn [#103].
* Updated dependencies [#94, #96, #97, #98, #99, #101, #102, #105, #108, #109].

2.8.0
=====

* No changes since 2.8.0-beta.5.

Please see the development releases below for the full list of features in this release.

2.8.0-beta.5
============

* Added a platform method to specify the OAuth redirect origin separately from
  the general HTTP origin [#93].
* Updated dependencies [#92].

2.8.0-beta.4
============

* Fix missing qs dependency
* Updated dependencies [#91]

2.8.0-beta.3
============

* FileThingpediaClient now implements lookupLocation and lookupEntity, which
  should help when manually annotating dialogues [#89].
* Fixed OAuth 2.0 helpers with Entity type mixin parameters [#89].
* The library was relicensed to Apache 2.0. This makes the licensing consistent
  with other components of Genie and Almond [#86].
* Updated dependencies [#87, #88, #90].


2.8.0-beta.2
============

* Added support for multiple developer dirs [#85].
* Misc bug fixes [#84].

2.8.0-beta.1
============

* FileThingpediaClient now supports multiple datasets in one dataset.tt file [#78]
* Updated dependencies [#76, #77, #79, #80, #81, #82].

2.8.0-alpha.1
=============

* HttpClient now fully supports the getAllDeviceNames() method, which can be used to
  get a full snapshot of Thingpedia [#59, #75].
* Minor fixes to the developer dir support [#58, #59].
* Updated dependencies [#61, #62, #63, #64, #65, #67, #68, #69, #70, #71, #72, #74].

2.7.0
=====

* No changes since 2.7.0-beta.2.

Please see the development releases below for the full list of features in this release.

2.7.0-beta.2
============

* Added the ability to specify a "developer directory", which is a local directory
  containing Thingpedia devices that overrides the configured remote Thingpedia,
  for testing [#57].

2.7.0-beta.1
============

* Reduced logging verbosity.

2.7.0-alpha.4
=============

* Added support for query invocation hints: Thingpedia queries now receive
  a "hint" containing which filters, projections, sorting and slicing operations
  will be applied on the result. Query implementations can use the hint to reduce
  the amount of data retrieved from the server.

2.7.0-alpha.3
=============

* Misc bug fixes to help running Almond on Windows [#51].

2.7.0-alpha.2
=============

* Internationalization improvements:
  - Builtin classes are now translated when loading.
  - Translations are automatically loaded from JS devices, if a `po/`
    directory containing `.mo` files is includes in the zip file
* The manifest of Thingpedia devices is now exposed as the `manifest`
  property on the device class.
* Updated to thingtalk 1.10.0-alpha.2

2.7.0-alpha.1
=============

New features:
* Placeholder interpolation in annotations of generic devices
  (e.g. in `#[url]`, `#_[name]`) is now using the
  [string-interp](https://npmjs.com/string-interp) library, which
  provides a greater set of options for i18n and makes it
  consistent across all annotations #[46].
* Placeholder interpolation for device names and descriptions
  is now applied to all devices, which improves i18n of devices [#46].
* The Content Helper API is now stricter in recognizing which URLs
  are publicly accessible, and will reject private IPs or local hostnames [#45].
* Updated dependencies [#47].

Breaking changes:
* Node.js 8 is no longer supported, as the new i18n code requires
  a recent version of the Intl API.

2.6.1
=====

* The Content Helper API is now stricter in recognizing which URLs
  are publicly accessible, and will reject private IPs or local hostnames [#45].

2.6.0
=====

Please see the previous release notes for the full list of changes and new features
in this release series.

2.6.0-alpha.2
=============

* Fixed bad API in FileThingpediaClient; now the API is consistent
  with the base class [#43]
* Added utilities to obtain device configuration info from a ThingTalk class [#42]
* Added JSDoc-based documentation [#41]

2.6.0-alpha.1
=============

* Added new API to the ThingpediaClient interface, which were assumed
  present and used by Genie [#32]
* Added FileThingpediaClient, a ThingpediaClient implementation based
  on local files [#32, #37, #38]
* Build and dependency updates [#39, #40]

2.5.2
=====

* Fixed referencing abstract classes as subdevices [#36]
* Fixed semi-custom OAuth (required by Home Assistant) [#35]

2.5.1
=====

* Fixed accidental compatibility break [#31]
* Added support for HTTP status 308 [#30]

2.5.0
=====

No changes. Please see the beta version release notes for the full list of changes and
new features in this release.

2.5.0-beta.1
============

* The `thingpedia-client` library was imported here. It includes
  the loaders for Thingpedia devices and the configuration mixins.
  The goal is that `thingpedia` will become a sufficient library
  to consume Thingpedia devices without a full instance of Almond.
  To this end, the import also includes new classes `BasePlatform`
  and `BaseEngine`, which provide the full extend of the engine
  and platform API that is guaranteed to be available to Thingpedia
  devices [#26].
* The configuration interface for Thingpedia devices was revamped and cleaned.
  Devices can now implement the following hooks:
  - `static loadFromOAuth2`: to configure a device using plain OAuth 2.0
  - `static loadFromCustomOAuth` + `static completeCustomOAuth`:
    to configure a device with custom OAuth-like flows
  - `static loadFromDiscovery` + `completeDiscovery` for local
    discovery (Bluetooth, UPnP)
  - `static loadInteractively` for interactive (dialog-based) configuration
  Devices using these hooks should return a new instance of themselves,
  and not call any engine method. The old mechanism, based on
  `loadOneDevice`, will continue to be supported but is deprecated
  and will go away in the next major version [#10, #26].
* New API: `BaseDevice.platform` is a simpler way to access platform-specific
  APIs from device implementations [#13, #26].
* `BaseDevice.engine` is now deprecated and should not be used [#26].
* `ObjectSet` and `RefCounted` are now exposed as `Helpers`; the old
  names are still accessible but are deprecated [#27].
* New API: `Preferences` & `Helpers.FilePreferences`; this is a simple
  persistent key-value store and provides the interface and usual
  implementation of `Platform.getSharedPreferences()`.
* Thingpedia devices can now include the `#[handle_thingtalk]` annotation
  on their functions; if so, only a single `query` method per class is expected,
  instead of one `get_` method per Thingpedia function [#28].
* Updated dependencies [#24, #25, #29].

2.4.0
=====
* Error caused by OAuth are now wrapped in a custom error class,
  which is exposed in the API [#23]
* Updated dependencies

2.3.4
=====
* Fixed handling of 301/302/307 redirects after POST requests
* Updated dependencies

2.3.3
=====
* Output of HTTP helpers can be made quieter with a new `debug`
  option [#17]

2.3.2
=====
* Updated ThingTalk dependency

2.3.1
=====
* Extra data returned by /token OAuth2 endpoint is now available
  to the helpers callback [#14]

2.3.0
=====
* BaseDevice now provides a default name, description and uniqueId,
  based on the Thingpedia metadata.
* Support code for v1 Thingpedia devices was removed.

2.2.3
=====
* Refactored the RSS helpers to use a third-party library, making
  them more robust [#7]
* Fixed 307 redirection in HTTP helpers

2.2.2
=====

* Removed loader modules, which were moved to thingengine-core (and soon
  will be moved to a separate thingpedia-client module) [#3]

2.2.1
=====

* Fixed handling of 301 redirects [#1]

2.2.0
=====

* First official release in npm
* Much of the compatibility API that was obsoleted in 2.0.0 was removed.
