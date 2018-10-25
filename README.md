# Thingpedia Device API

[![Build Status](https://travis-ci.org/Stanford-Mobisocial-IoT-Lab/thingpedia-api.svg?branch=master)](https://travis-ci.org/Stanford-Mobisocial-IoT-Lab/thingpedia-api) [![Coverage Status](https://coveralls.io/repos/github/Stanford-Mobisocial-IoT-Lab/thingpedia-api/badge.svg?branch=master)](https://coveralls.io/github/Stanford-Mobisocial-IoT-Lab/thingpedia-api?branch=master) [![Dependency Status](https://david-dm.org/Stanford-Mobisocial-IoT-Lab/thingpedia-api/status.svg)](https://david-dm.org/Stanford-Mobisocial-IoT-Lab/thingpedia-api) [![Greenkeeper badge](https://badges.greenkeeper.io/Stanford-Mobisocial-IoT-Lab/thingpedia-api.svg)](https://greenkeeper.io/)

## An Open, Crowdsourced Repository of APIs

Thingpedia is the open repository of API used by the [Almond Virtual Assistant](https://almond.stanford.edu).
Anyone can contribute the interface code to access any device or web service, and publish it on Thingpedia.

This package contains the public API and set of JS interfaces
that any package published in Thingpedia should implement.
It also contains a various helpers that are available to Thingpedia packages.

Thingpedia and Almond are research projects led by prof. Monica Lam,
from Stanford University.  You can find more information at
<https://almond.stanford.edu>

## Documentation

Documentation for this package is hosted on the [Almond website](https://almond.stanford.edu/thingpedia/developers).

**NOTE**: you should not install this package separately from npm. If you are writing
an interface for Thingpedia, the correct version of this module is already available
in the environment and you can just `require('thingpedia')`. The only case where it is
useful to install this module is when you're developing Almond itself.

## License

This package is covered by the 3-clause BSD license.
