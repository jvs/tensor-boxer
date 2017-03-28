import os
import json


def list_images():
    directory = os.environ['TENSORBOXER_IMAGE_DIR']
    formats = ('.jpg', '.jpeg', '.png', '.gif')
    return sorted(i for i in os.listdir(directory) if i.endswith(formats))


def image_path(imagename):
    directory = os.environ['TENSORBOXER_IMAGE_DIR']
    return os.path.join(directory, imagename)


def boxes_path(imagename):
    directory = os.environ['TENSORBOXER_WORKSPACE_DIR']
    basename = imagename.rsplit('.', 1)[0] + '.json'
    return os.path.join(directory, basename)


def save_boxes(imagename, boxes):
    assert isinstance(boxes, basestring)
    # Indent the json file for readability.
    with open(boxes_path(imagename), 'w') as f:
        json.dump(json.loads(boxes), f, indent=2)


def next_image(imagename):
    return _jump_by(imagename, 1)


def prev_image(imagename):
    return _jump_by(imagename, -1)


def _jump_by(imagename, count):
    images = list_images()
    index = count + images.index(imagename)
    return images[index] if 0 <= index < len(images) else None
