require('shelljs/global');

var argv = require('yargs').argv;
var assign = require('object-assign');
var buffer = require('vinyl-buffer');
var connect = require('connect');
var del = require('del');
var frontMatter = require('front-matter');
var gulp = require('gulp');
var gulpIf = require('gulp-if');
var gutil = require('gulp-util');
var he = require('he');
var hljs = require('highlight.js');
var htmlmin = require('gulp-htmlmin');
var jshint = require('gulp-jshint');
var nunjucks = require('nunjucks');
var path = require('path');
var plumber = require('gulp-plumber');
var Remarkable = require('remarkable');
var rename = require('gulp-rename');
var serveStatic = require('serve-static');
var source = require('vinyl-source-stream');
var through = require('through2');
var less = require('gulp-less');
var minifyCSS = require('gulp-minify-css');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');

/**
 * The output directory for all the built files.
 */
const DEST = './build';

/**
 * The name of the Github repo.
 */
const REPO = 'ratkovskymv.ru';


function isProd() {
  return process.env.NODE_ENV == 'production';
}


nunjucks.configure('templates', { autoescape: false });


function streamError(err) {
  gutil.beep();
  gutil.log(err instanceof gutil.PluginError ? err.toString() : err.stack);
}


function extractFrontMatter(options) {
  var files = [];
  var site = assign({pages: []}, options);
  return through.obj(
    function transform(file, enc, done) {
      var contents = file.contents.toString();
      var yaml = frontMatter(contents);

      if (yaml.attributes) {
        var slug = path.basename(file.path, path.extname(file.path));

        file.contents = new Buffer(yaml.body);
        file.data = {
          site: site,
          page: assign({slug: slug}, yaml.attributes)
        };

        if (file.path.indexOf('pages') > -1) {
          site.pages.push(file.data.page);
        }
      }

      files.push(file);
      done();
    },
    function flush(done) {
      files.forEach(function(file) { this.push(file); }.bind(this));
      done();
    }
  )
}


function renderMarkdown() {
  var markdown = new Remarkable({
    html: true,
    typographer: true,
    highlight: function (code, lang) {
      // Unescape to avoid double escaping.
      code = he.unescape(code);
      return lang ? hljs.highlight(lang, code).value : he.escape(code);
    }
  });
  return through.obj(function (file, enc, cb) {
    try {
      if (path.extname(file.path) == '.md') {
        file.contents = new Buffer(markdown.render(file.contents.toString()));
      }
      this.push(file);
    }
    catch (err) {
      this.emit('error', new gutil.PluginError('renderMarkdown', err, {
        fileName: file.path
      }));
    }
    cb();
  });
}


function renderTemplate() {
  return through.obj(function (file, enc, cb) {
    try {
      // Render the file's content to the page.content template property.
      var content = file.contents.toString();
      file.data.page.content = nunjucks.renderString(content, file.data);

      // Then render the page in its template.
      var template = file.data.page.template;
      file.contents = new Buffer(nunjucks.render(template, file.data));

      this.push(file);
    }
    catch (err) {
      this.emit('error', new gutil.PluginError('renderTemplate', err, {
        fileName: file.path
      }));
    }
    cb();
  });
}


gulp.task('html', function() {

  var baseData = require('./config.json');
  var overrides = {
    baseUrl: isProd() ? '/' + REPO + '/' : '/',
    env: isProd() ? 'prod' : 'dev'
  };
  var siteData = assign(baseData, overrides);

  return gulp.src(['./pages/**/*'], {base: process.cwd()})
      .pipe(plumber({errorHandler: streamError}))
      .pipe(extractFrontMatter(siteData))
      .pipe(renderMarkdown())
      .pipe(renderTemplate())
      .pipe(rename(function(path) {
          path.dirname = '/';
          path.extname = '.html';
      }))
      .pipe(htmlmin({
        removeComments: true,
        collapseWhitespace: true,
        collapseBooleanAttributes: true,
        removeAttributeQuotes: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        minifyJS: true,
        minifyCSS: true
      }))
      .pipe(gulp.dest(DEST));
});


gulp.task('images', function() {
  return gulp.src('./assets/images/**/*')
      .pipe(gulp.dest(path.join(DEST, 'images')));
});

gulp.task('less', function() {
    gulp.src(['assets/css/styles.less'])
        .pipe(less())
        .pipe(minifyCSS())
	.pipe(gulp.dest(path.join(DEST, 'styles')));
        //.pipe(gulp.dest('build/styles'))
})

gulp.task('lint', function() {
  return gulp.src('./assets/javascript/**/*.js')
      .pipe(plumber({errorHandler: streamError}))
      .pipe(jshint())
      .pipe(jshint.reporter('default'))
      .pipe(gulpIf(isProd(), jshint.reporter('fail')))
});


gulp.task('uglify', ['lint'], function(callback) {
  return gulp.src('./assets/javascript/main.js')
    .pipe(uglify())
    .pipe(gulp.dest(path.join(DEST, 'javascript')))
    .on('error', streamError);
});

gulp.task('cufon', function(callback) {
  return gulp.src([
	'./assets/javascript/CyrillicOld_700.font.js',
	'./assets/javascript/cufon-yui.js',
	])
    .pipe(gulp.dest(path.join(DEST, 'javascript')))
    .on('error', streamError);
});

gulp.task('js', ['uglify', 'cufon']);

gulp.task('clean', function(done) {
  del(DEST, done);
});


gulp.task('default', ['less', 'images', 'js', 'html']);


gulp.task('serve', ['default'], function() {
  var port = argv.port || argv.p || 4000;
  connect().use(serveStatic(DEST)).listen(port);

  gulp.watch('./assets/css/**/*.css', ['less']);
  gulp.watch('./assets/css/**/*.less', ['less']);
  gulp.watch('./assets/images/*', ['images']);
  gulp.watch('./assets/javascript/*', ['javascript']);
  gulp.watch(['*.html', './pages/*', './templates/*'], ['html']);
});


gulp.task('deploy', ['default'], function() {

  if (process.env.NODE_ENV != 'production') {
    throw new Error('Deploying requires NODE_ENV to be set to production');
  }

  // TODO: deploy ./build to hostline.ru via ftp or ssh

});
