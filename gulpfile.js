import browserSync from 'browser-sync'
import gulp from 'gulp'
import prefixer from 'gulp-autoprefixer'
import gulpAvif from 'gulp-avif'
import gulpClean from 'gulp-clean'
import concat from 'gulp-concat'
import fonter2 from 'gulp-fonter-2' // This version founter fixed bug path generation for all operations systems
import htmlmin from 'gulp-htmlmin'
import imagemin, { gifsicle, mozjpeg, optipng } from 'gulp-imagemin'
import include from 'gulp-include'
import newer from 'gulp-newer'
import postcss from 'gulp-postcss'
import gulpSass from 'gulp-sass'
import sourcemaps from 'gulp-sourcemaps'
import terser from 'gulp-terser'
import ttf2woff2 from 'gulp-ttf2woff2'
import webp from 'gulp-webp'
import * as sass from 'sass'
const { dest, parallel, series, src, task, watch } = gulp

const sassCompiler = gulpSass(sass)

export const optimizeImg = () => {
	return src('src/img/*.{jpg,png,gif}')
		.pipe(newer('src/img/source/optimize'))
		.pipe(
			imagemin([
				gifsicle({ interlaced: true }),
				mozjpeg({ quality: 80, progressive: true }),
				optipng({ optimizationLevel: 2 }),
			]),
			{ verbose: true }
		)
		.on('error', err => {
			console.log(err.message)
		})
		.pipe(dest('src/img/source/optimize'))
}

// Convert to WEBP
export const convert2webp = () => {
	return src('src/img/source/optimize/*.{jpg,png}')
		.pipe(newer('src/img/source/webp'))
		.pipe(webp())
		.pipe(dest('src/img/source/webp'))
}

// Convert to AVIF
export const convert2avif = () => {
	return src('src/img/source/optimize/*.{jpg,png}')
		.pipe(gulpAvif({ quality: 50 }))
		.pipe(dest('src/img/source/avif'))
}

// Convert to WOFF2 and WOFF fonts
export const fonts = () => {
	return src('src/fonts/*.*')
		.pipe(newer('dist/fonts'))
		.pipe(fonter2({ formats: ['ttf', 'woff'] }))
		.pipe(dest('dist/fonts'))
		.pipe(src('dist/fonts/*.ttf'))
		.pipe(ttf2woff2())
		.pipe(dest('dist/fonts'))
}

export const pages = () => {
	return src('src/pages/*.html')
		.pipe(
			include({
				includePaths: 'src/components',
			})
		)
		.pipe(dest('dist'))
		.pipe(browserSync.stream())
}

// Compress HTML FILE > dist
export const htmlMin = () => {
	return src('dist/*.html')
		.pipe(htmlmin({ collapseWhitespace: true }))
		.pipe(dest('dist'))
		.pipe(browserSync.stream())
}

// Compile and Compress SCSS > dist/css
export const compileSass = () => {
	return src('src/scss/**/*.scss')
		.pipe(sourcemaps.init())
		.pipe(newer('dist/css/style.min.css'))
		.pipe(concat('style.min.css'))
		.pipe(prefixer())
		.pipe(
			sassCompiler({ outputStyle: 'compressed' }).on(
				'error',
				sassCompiler.logError
			)
		)
		.pipe(postcss())
		.pipe(sourcemaps.write())
		.pipe(dest('dist/css'))
		.pipe(browserSync.stream())
}

export const concatCSS = () => {
	return src('dist/css/*.css')
		.pipe(concat('style.min.css'))
		.pipe(dest('dist/css'))
}

// Compress JS FILE > dist/js
export const compressJS = () => {
	return src('src/js/*.js')
		.pipe(sourcemaps.init())
		.pipe(newer('dist/js/main.min.js'))
		.pipe(concat('main.min.js'))
		.pipe(terser())
		.pipe(sourcemaps.write())
		.pipe(dest('dist/js'))
		.pipe(browserSync.stream())
}

export const browsersync = () => {
	browserSync.init({
		server: {
			baseDir: 'dist',
		},
	})
}

function clean(path) {
	return src(path, { read: false, allowEmpty: true }).pipe(gulpClean())
}

export const cleanDist = () => clean('dist')
export const cleanIMG = () => clean('src/img/source')

export const successImage = () => {
	return src('src/img/dist/*.*').pipe(dest('dist/img'))
}

export const watchFiles = () => {
	watch(['src/scss/**/*.scss'], series(compileSass, concatCSS))
	watch(['src/js/*.js'], compressJS)
	watch(['src/img/*.{jpg,png,gif}'], optimizeImg)
	watch(['src/img/*.{jpg,png}'], convert2webp)
	watch(['src/img/*.{jpg,png}'], convert2avif)
	watch(['src/img/dist/*.*'], successImage)
	watch(['src/fonts/*.*'], fonts)
	watch(['src/pages/*', 'src/components/*'], pages)
}

task(
	'default',
	series(
		cleanDist, // Clean dist
		cleanIMG, // Clean IMG // Minify html
		compileSass, // Compile SASS
		concatCSS,
		compressJS, // Compress JS
		optimizeImg, // Optimize IMG
		convert2avif, // Convert to avif
		convert2webp, // Convert to webp
		fonts, // Convert fonts
		pages,
		htmlMin,
		parallel(browsersync, watchFiles) // Watch File, and browser reload
	)
)
