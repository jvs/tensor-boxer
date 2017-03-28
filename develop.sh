export FLASK_APP=tensor-boxer/main.py
export FLASK_DEBUG=1

export TENSORBOXER_IMAGE_WIDTH=2048
export TENSORBOXER_IMAGE_HEIGHT=2048

export TENSORBOXER_IMAGE_DIR=~/Downloads/tensor-boxer/images
export TENSORBOXER_WORKSPACE_DIR=~/Downloads/tensor-boxer/workspace

flask run
