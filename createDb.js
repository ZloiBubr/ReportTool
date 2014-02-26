var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/plex');

var Cat = mongoose.model('Cat', { name: String });

var kitty = new Cat({ name: 'Zildjian' });

kitty.save(function (err) {
    if (err) throw err;
        console.log('meow');
});