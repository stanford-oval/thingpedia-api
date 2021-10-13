# Thingpedia SDK

[![Build Status](https://travis-ci.org/stanford-oval/thingpedia-api.svg?branch=master)](https://travis-ci.org/stanford-oval/thingpedia-api) [![Coverage Status](https://coveralls.io/repos/github/stanford-oval/thingpedia-api/badge.svg?branch=master)](https://coveralls.io/github/stanford-oval/thingpedia-api?branch=master) [![Dependency Status](https://david-dm.org/stanford-oval/thingpedia-api/status.svg)](https://david-dm.org/stanford-oval/thingpedia-api)

## An Open, Crowdsourced Repository of APIs

Thingpedia is the open repository of API used by the [Genie Virtual Assistant](https://genie.stanford.edu).
Anyone can contribute the interface code to access any device or web service, and publish it on Thingpedia.

This package contains the software development kit (SDK) used to develop new
interfaces in Thingpedia. This includes both the abstract classes that any
Thingpedia interface must subclass, as well as various helpers that are available
to Thingpedia packages, to ease interaction with web APIs.
This package also contains the client side libraries to retrieve and
instantiate the interface code from a public Thingpedia instance.

Thingpedia is developed by the Stanford Open Virtual Assistant Lab, a research
initiative led by prof. Monica Lam, from Stanford University.
You can find more information at <https://oval.cs.stanford.edu>

## Documentation

Documentation for this package is hosted on the [Genie wiki](https://wiki.genie.stanford.edu/thingpedia).

**NOTE**: if you are writing an interface for Thingpedia, you should not install this package separately from npm.
The correct version of this module is already available in the environment and you can just `require('thingpedia')`.
The only case where it is useful to install this module separately is when you're developing
a client to Thingpedia (i.e. a custom virtual assistant).

## License

This package is covered by the Apache 2.0 license. See [LICENSE](LICENSE) for details.
