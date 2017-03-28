(function() {

var ZOOM_PCNT = 0.7;

var currentImage = null;
var currentTool = null;
var selection = null;
var cameraRect = null;
var boxes = null;

function canvasWidth() {
    return document.getElementById('Canvas').width;
}

function canvasHeight() {
    return document.getElementById('Canvas').height;
}

function projection() {
    // Return values for converting between image-space and canvas-space.
    var scaleX = canvasWidth() / (cameraRect.x2 - cameraRect.x1);
    var scaleY = canvasHeight() / (cameraRect.y2 - cameraRect.y1);
    var scale = Math.min(scaleX, scaleY);
    return {
        scale: Math.min(scaleX, scaleY),
        dx: -cameraRect.x1 * scale,
        dy: -cameraRect.y1 * scale
    };
}

function screenToCanvas(pt) {
    var stage = document.getElementById('Canvas').getBoundingClientRect();
    return {
        x: pt.x - stage.left,
        y: pt.y - stage.top
    };
}

function canvasToImage(pt) {
    // To transform canvas-space to image-space: un-translate, then un-scale.
    var m = projection();
    return {
        x: (pt.x - m.dx) / m.scale,
        y: (pt.y - m.dy) / m.scale
    };
}

function screenToImage(pt) {
    return canvasToImage(screenToCanvas(pt));
}

function untranslate(box) {
    var pt1 = screenToCanvas({x: box.x1, y: box.y1});
    var pt2 = screenToCanvas({x: box.x2, y: box.y2});
    return makeBox(pt1, pt2);
}

function unproject(box) {
    var pt1 = screenToImage({x: box.x1, y: box.y1});
    var pt2 = screenToImage({x: box.x2, y: box.y2});
    return makeBox(pt1, pt2);
}

function makeBox(pt1, pt2) {
    return {
        x1: Math.min(pt1.x, pt2.x),
        y1: Math.min(pt1.y, pt2.y),
        x2: Math.max(pt1.x, pt2.x),
        y2: Math.max(pt1.y, pt2.y)
    };
}

function scrollBy(amt) {
    cameraRect = {
        x1: cameraRect.x1 + amt.dx,
        y1: cameraRect.y1 + amt.dy,
        x2: cameraRect.x2 + amt.dx,
        y2: cameraRect.y2 + amt.dy
    };
}

function zoomIn() {
    var w = cameraRect.x2 - cameraRect.x1;
    var h = cameraRect.y2 - cameraRect.y1;
    var scale = (1 - ZOOM_PCNT) / 2;
    var dx = w * scale;
    var dy = h * scale;
    cameraRect = {
        x1: cameraRect.x1 + dx,
        y1: cameraRect.y1 + dy,
        x2: cameraRect.x2 - dx,
        y2: cameraRect.y2 - dy
    };
}

function zoomOut() {
    var w = cameraRect.x2 - cameraRect.x1;
    var h = cameraRect.y2 - cameraRect.y1;
    var scale = (1 / ZOOM_PCNT - 1) / 2;
    var dx = w * scale;
    var dy = h * scale;
    cameraRect = {
        x1: cameraRect.x1 - dx,
        y1: cameraRect.y1 - dy,
        x2: cameraRect.x2 + dx,
        y2: cameraRect.y2 + dy
    };
}

function resetView() {
    currentTool = new ZoomTool();
    cameraRect = {
        x1: 0,
        y1: 0,
        x2: currentImage.width,
        y2: currentImage.height
    };
}

function undo() {
    if (boxes.length > 0) {
        boxes.pop();
    }
}

function submit() {
    var normalized = [];
    for (var i = 0; i < boxes.length; i += 1) {
        var box = boxes[i];
        normalized.push({
            x1: Math.round(box.x1),
            y1: Math.round(box.y1),
            x2: Math.round(box.x2),
            y2: Math.round(box.y2)
        });
    }
    document.getElementById('Boxes').value = JSON.stringify(normalized);
    document.getElementById('Form').submit();
}

function goBack() {
    window.location.href = '/prev/' + currentName;
}

function goForward() {
    window.location.href = '/next/' + currentName;
}

function redraw() {
    var canvas = document.getElementById('Canvas');
    var stage = canvas.getBoundingClientRect();
    canvas.width = window.innerWidth - stage.left * 2;
    canvas.height = window.innerHeight - stage.top * 2;

    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var m = projection();
    ctx.drawImage(currentImage, m.dx, m.dy,
        currentImage.width * m.scale,
        currentImage.height * m.scale);

    ctx.save();
    ctx.translate(m.dx, m.dy);
    ctx.scale(m.scale, m.scale);
    ctx.lineWidth = 1;

    for (var i = 0; i < boxes.length; i += 1) {
        var box = boxes[i];
        if (box == selection) {
            ctx.strokeStyle = 'rgb(255, 100, 20)';
            ctx.fillStyle = 'rgba(255, 100, 20, 0.4)';
        } else {
            ctx.strokeStyle = 'rgb(55, 220, 110)';
            ctx.fillStyle = 'rgba(55, 220, 110, 0.4)';
        }
        drawBox(ctx, boxes[i]);
    }
    ctx.restore();

    if (currentTool.onRedraw) {
        currentTool.onRedraw(ctx);
    }
}

function drawBox(ctx, box) {
    ctx.beginPath();
    ctx.rect(
        Math.min(box.x1, box.x2),
        Math.min(box.y1, box.y2),
        Math.abs(box.x1 - box.x2),
        Math.abs(box.y1 - box.y2)
    );
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
}

function _boxToolOnMouseDown(tool, pt) {
    tool.box = makeBox(pt, pt);
}

function _boxToolOnMouseMove(tool, pt) {
    if (tool.box !== null) {
        tool.box.x2 = pt.x;
        tool.box.y2 = pt.y;
    }
};

function ZoomTool() {
    this.box = null;
}

ZoomTool.prototype.onMouseDown = function(pt) {
    _boxToolOnMouseDown(this, pt);
};

ZoomTool.prototype.onMouseMove = function(pt) {
    _boxToolOnMouseMove(this, pt);
};

ZoomTool.prototype.onMouseUp = function(pt) {
    this.onMouseMove(pt);
    var w = Math.abs(this.box.x2 - this.box.x1);
    var h = Math.abs(this.box.y2 - this.box.y1);

    if (w + h <= 8) {
        // MUST: Scale so that the point under the mouse stays under the mouse
        // after zooming.
    } else {
        cameraRect = unproject(this.box);
        currentTool = new RectTool();
    }
    this.box = null;
};

ZoomTool.prototype.onRedraw = function(ctx) {
    if (this.box !== null) {
        ctx.strokeStyle = 'rgb(255, 255, 255)';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.333)';
        drawBox(ctx, untranslate(this.box));
    }
};

function RectTool() {
    this.box = null;
    selection = null;
}

RectTool.prototype.onMouseDown = function(pt) {
    _boxToolOnMouseDown(this, pt);
    boxes.push(unproject(this.box));
};

RectTool.prototype.onMouseMove = function(pt) {
    if (this.box !== null) {
        _boxToolOnMouseMove(this, pt);
        boxes[boxes.length - 1] = unproject(this.box);
    }
};

RectTool.prototype.onMouseUp = function(pt) {
    this.onMouseMove(pt);
    var tmp = unproject(this.box);
    if (Math.abs(tmp.x2 - tmp.x1) < 4 || Math.abs(tmp.y2 - tmp.y1) < 4) {
        boxes.pop();
    }
    this.box = null;
};

function ArrowTool() {
    this.position = null;
}

ArrowTool.prototype.onMouseDown = function(pt) {
    var hit = screenToImage(pt);
    this.position = null;
    selection = null;

    for (var i = 0; i < boxes.length; i += 1) {
        var box = boxes[i];
        var inside = (box.x1 <= hit.x && hit.x <= box.x2
            && box.y1 <= hit.y && hit.y <= box.y2);
        if (inside) {
            selection = box;
            this.position = pt;
            break;
        }
    }
};

ArrowTool.prototype.onMouseMove = function(pt) {
    if (this.position !== null && this.selection !== null) {
        var dx = pt.x - this.position.x;
        var dy = pt.y - this.position.y;
        selection.x1 += dx;
        selection.y1 += dy;
        selection.x2 += dx;
        selection.y2 += dy;
        this.position = pt;
    }
};

ArrowTool.prototype.onMouseUp = function(pt) {
    this.position = null;
};

window.onload = function() {
    currentImage = new Image();
    currentImage.onload = loadBoxes;
    currentImage.src = '/images/' + currentName;
};

function loadBoxes() {
    var request = new XMLHttpRequest();
    request.onload = function() {
        if (request.status == 200) {
            boxes = JSON.parse(request.responseText);
        }
        finishLoading();
    };
    // Append a timestamp to the path in order to dodge the cache.
    var abspath = '/boxes/' + currentName + '?' + (new Date()).getTime();
    request.open('GET', abspath, true);
    request.send();
}

function finishLoading() {
    cameraRect = {
        x1: 0,
        y1: 0,
        x2: currentImage.width,
        y2: currentImage.height
    };

    var locate = function(evt) {
        return { x: evt.pageX, y: evt.pageY };
    };

    var consume = function(evt) {
        evt.stopPropagation();
        evt.preventDefault();
        redraw();
        return false;
    };

    var Consumer = function(f) {
        return function(evt) {
            f(locate(evt));
            return consume(evt);
        };
    };

    currentTool = new ZoomTool();

    document.body.onmousedown = Consumer(function(pt) {
        if (currentTool.onMouseDown) {
            currentTool.onMouseDown(pt);
        }
    });

    document.body.onmouseup = Consumer(function(pt) {
        if (currentTool.onMouseUp) {
            currentTool.onMouseUp(pt);
        }
    });

    document.body.onmousemove = Consumer(function(pt) {
        if (currentTool.onMouseMove) {
            currentTool.onMouseMove(pt);
        }
    });

    document.body.onwheel = function(evt) {
        var conv = {dx: evt.deltaX, dy: evt.deltaY};
        if (currentTool.onWheel) {
            currentTool.onWheel(conv);
        } else {
            scrollBy(conv);
        }
        return consume(evt);
    };

    window.addEventListener('keydown', function(evt) {
        switch (evt.key) {
            case '=': zoomIn(); break;
            case '+': zoomIn(); zoomIn(); break;
            case '-': zoomOut(); break;
            case '_': zoomOut(); zoomOut(); break;
            case '0': resetView(); break;
            case '1': currentTool = new ZoomTool(); break;
            case '2': currentTool = new RectTool(); break;
            case '3': currentTool = new ArrowTool(); break;
            case 'z': undo(); break;
            case 'Enter': submit(); break;

            case '[': case '{': goBack(); break;
            case ']': case '}': goForward(); break;

            case 'Backspace':
            if (selection !== null) {
                boxes = boxes.filter(function(box) { return box !== selection; });
                currentTool = new RectTool();
            }
            break;
        }

        var legend = {
            'ArrowUp': [0, -1],
            'ArrowDown': [0, 1],
            'ArrowLeft': [-1, 0],
            'ArrowRight': [1, 0]
        };
        if (selection !== null && legend.hasOwnProperty(evt.key)) {
            var d = legend[evt.key];
            selection.x1 += d[0];
            selection.y1 += d[1];
            selection.x2 += d[0];
            selection.y2 += d[1];
        }
        redraw();
    });

    var nop = Consumer(function() {});
    document.body.onclick = nop;
    document.body.ondblclick = nop;
    redraw();
}

})();
