import os
import flask
import storage


app = flask.Flask(__name__)


@app.route('/')
def index():
    return flask.render_template('index.html', images=storage.list_images())


@app.route('/stage/<name>')
def stage(name):
    return flask.render_template('stage.html', name=name)


@app.route('/images/<name>')
def image(name):
    return flask.send_file(storage.image_path(name), mimetype='image/jpeg')


@app.route('/next/<name>')
def next_image(name):
    return _redirect(storage.next_image(name))


@app.route('/prev/<name>')
def prev_image(name):
    return _redirect(storage.prev_image(name))


@app.route('/boxes/<name>')
def boxes(name):
    path = storage.boxes_path(name)
    if os.path.exists(path):
        return flask.send_file(path, mimetype='application/json')
    else:
        return flask.jsonify([])


@app.route('/submit', methods=['POST'])
def submit():
    form = flask.request.form
    storage.save_boxes(form['Name'], form['Boxes'])
    return _redirect(storage.next_image(form['Name']))


def _redirect(imagename):
    abspath = '/' if imagename is None else ('/stage/' + imagename)
    return flask.redirect(abspath, code=302)
