#!/bin/bash

podir=`dirname $0`
mkdir -p $podir/tmp
for f in $podir/../device-classes/org.thingpedia.builtin.translatable.tt ; do
	kind=`basename $f .tt`
	node $podir/extract-translatable-annotations.js $f > $podir/tmp/$kind.js
done
xgettext -kN_ -c -f $podir/POTFILES -x $podir/POTFILES.skip -o $podir/thingengine-core.pot --package-name  thingengine-core --package-version 0.0.1
