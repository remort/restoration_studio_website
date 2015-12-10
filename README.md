# ratkovskymv

A fully static website about restoration studio in Ekaterinburg, Russia run by Ratkovsky M. V.

[Github](https://github.com/remort/restoration_studio_website)
[View Site](http://ratkovskymv.ru)

## Viewing the site locally

The ratkovskymv site can be built with [Node.js](http://nodejs.org/). If you have Node.js installed on your system, you can run the following commands to build and serve a local copy.

```sh
# Clone the git repository and cd into the cloned directory.
git clone git@github.com:remort/restoration_studio_website.git
cd restoration_studio_website

# Install the dependencies
npm install

# Build and serve the site at http://localhost:4000
npm start
```

This starts up a local server on port 4000. To view the site in your browser, navigate to [http://localhost:4000](http://localhost:4000). If you want to use a different port, you can pass the port number as an argument to `npm start`:

```sh
npm start -- -p 8080
```

In addition to building the site and serving it locally, this will also listen for any changes and rebuild the site as needed. This allows you to play around with the code, refresh the browser, and see your changes instantly.
