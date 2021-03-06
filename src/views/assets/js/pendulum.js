var p1, p2, p3, p4, p6;
var canvasWidth = 1280;
var instances = {};
var instancePositions = {};
var maxInstances = 5;
var startingInstance = 1;

var playAnimation = false;

var elements = {
  lengthSliderValue: "length-slider-value",
  lengthSlider: "length-slider",
  massSliderValue: "mass-slider-value",
  massSlider: "mass-slider",
  offsetSliderValue: "offset-slider-value",
  offsetSlider: "offset-slider",
  color: "color",
  colorValue: "color-value",
  pendulumEdited: "pendulum-edited",
  pendulumIndex: "pendulum-index",
  globalStart: "global-start",
  globalStop: "global-stop",
  globalRestart: "global-restart",
  configInputs: "config-inputs"
};

window.onload = function() {
  disableConfigControls(true);

   var ws = new WebSocket("ws://localhost:8080/ws"); 

   ws.onopen = function(event) {
    console.log('Connected to the WebSockets server');
   };

   ws.onmessage = function (event) {
      const message = JSON.parse(event.data);
      processStateSignal(message);
   };

  setInterval(persistPositions, 500);
};

function processStateSignal(message) {
  if (message.state == "STOP" && playAnimation) {
    playAnimation = false;

    alert(`Imminent Collision between instances: ${message.instance} and ${message.neighbor}. Stopping the animation.`);
  }

  if (message.state == "RESTART") {
    setup();
    triggerAllInstances();
  }
}

async function loadInitialConfig() {
  var configs = {};

  for(let index = startingInstance; index <= maxInstances; index++) {
    const response = await axios.get(`${this.getHostUrlForPendulum(index)}/pendulum/config`);
    configs[index] = { 
      mass: response.data.mass,
      length: response.data.stringLength,
      angle: response.data.initialOffset,
      color: response.data.color  
    };
  }

  return configs;
}

function triggerAllInstances() {
  this.playAnimation = true;
}

function stopAllInstances() {
  this.playAnimation = false;

  for(var i = 1; i <= maxInstances; i++) {
    instances[i].angle = 0;
    instances[i].update();
  }
}

function updateStateValues(id) {
  var state = id.split('-')[1];
  var currentConfig = getStateConfig();
  var updatedValue = (!currentConfig[state]).toString();

  document.getElementById(`global-${state}`).value = updatedValue;
  triggerStateOperation(state, updatedValue);
}

function updatePosition(index, x, y) {
  const position = { x, y };
  instancePositions[index] = position;
}

function persistPositions() {
  if (playAnimation) {
    for(let index = startingInstance; index <= maxInstances; index++) {
      const payload = instancePositions[index];
  
      axios
        .put(`${getHostUrlForPendulum(index)}/pendulum/position`, payload)
        .catch(err => console.error(`Failed to save position for instance: ${index} error: ${err}`));
    }
  }
}

function triggerStateOperation(state, value) {
  switch(state) {
    case "start":
      triggerAllInstances();
    break;

    case "stop":
      stopAllInstances();
      disableConfigControls(true);
      break;

    case "restart":
      setup();
      triggerAllInstances();
      disableConfigControls(true);
      break;
  }
}

function getStateConfig() {
  return {
    start: document.getElementById(elements.globalStart).value == 'true',
    stop: document.getElementById(elements.globalStop).value == 'true',
    restart: document.getElementById(elements.globalRestart).value == 'true',
  };
}

function getCurrentConfigValues() {
  return {
    length: document.getElementById(elements.lengthSliderValue).value,
    mass: document.getElementById(elements.massSliderValue).value,
    angle: parseFloat(document.getElementById(elements.offsetSliderValue).value),
    color: document.getElementById(elements.color).value
  };
}

function computeInstancesGap() {
  return (canvasWidth / maxInstances) - 50;
}

function onSaveChangesClicked() {
  disableConfigControls(true);
  updateActivePendulumInstance();
  persistConfigForActivePendulum();
}

function disableConfigControls(value) {
  var childNodes = document.getElementById("config-editor").getElementsByTagName('*');
  for (var node of childNodes) {
      node.disabled = value;
  }

  document.getElementById(elements.pendulumEdited).innerText = "none";
  document.getElementById(elements.pendulumEdited).style.color = "#333"
  document.getElementById(elements.configInputs).style.borderColor = "#eee";
}

function updateConfigPendulumTitle(index) {
  document.getElementById(elements.pendulumEdited).innerText = `Instance #${index}`;
  document.getElementById(elements.pendulumIndex).value = index;

  updateActiveColor();
}

function displayCurrentConfig(config) {
  document.getElementById(elements.lengthSliderValue).value = config.length;
  document.getElementById(elements.massSliderValue).value = config.mass;
  document.getElementById(elements.offsetSliderValue).value = config.angle;
  document.getElementById(elements.colorValue).value = config.color;

  document.getElementById(elements.lengthSlider).value = config.length;
  document.getElementById(elements.massSlider).value = config.mass;
  document.getElementById(elements.offsetSlider).value = config.angle;
  document.getElementById(elements.color).value = config.color;
}


function getActivePendulumIndex() {
  return Number(document.getElementById(elements.pendulumIndex).value);
}

function updateActiveColor() {
  const color = document.getElementById(elements.colorValue).value;
  document.getElementById(elements.pendulumEdited).style.color = color;
  document.getElementById(elements.configInputs).style.borderColor = color;
}

function onValueChange(id, value) {
  document.getElementById(`${id}-value`).innerText = value;

  updateActiveColor();
  updateActivePendulumInstance();
}

function displayPendulumAngle(angle) {
  document.getElementById(elements.offsetSlider).value = angle.toFixed(2);
  document.getElementById(elements.offsetSliderValue).innerText = angle.toFixed(2);
}

function updateActivePendulumInstance() {
  var activeIndex = getActivePendulumIndex();
  var config = getCurrentConfigValues();

  var gap = computeInstancesGap();
  instances[activeIndex] = new Pendulum(createVector(gap * activeIndex), config.length, config.mass, activeIndex, config.angle, config.color);
  instances[activeIndex].update();
}

function getHostUrlForPendulum(index) {
  return `http://localhost:${3000 + index}/v1`;
};

async function persistConfigForActivePendulum() {
  const config = getCurrentConfigValues();
  const activeIndex = getActivePendulumIndex();

  const payload = {
    initialOffset: config.angle,
    mass: config.mass,
    stringLength: config.length,
    maximumWindFactor: 5,
    color: config.color
  };

  const response = await axios.put(`${getHostUrlForPendulum(activeIndex)}/pendulum/config`, payload);
}

function setup()  {
  createCanvas(1280,480);
  var gap = computeInstancesGap();
  loadInitialConfig()
  .then(configs => {
    for(var i = startingInstance; i <= maxInstances; i++) {
      instances[i] = new Pendulum(createVector(gap * i), configs[i].length, configs[i].mass, i, configs[i].angle, configs[i].color);
    }

    render();
  });
}

function render() {
  background(51);

  for(var i = 1; i <= maxInstances; i++) {
    if (instances[i] != null)
      instances[i].dragDisplay();
  }
}

function draw() {
  background("#f2f2f3");

  for(var i = 1; i <= maxInstances; i++) {
    if (instances[i] != null) {
      if (this.playAnimation)
        instances[i].go();
      else 
        instances[i].dragDisplay();
    }
  }
}

function mousePressed() {
  for(var i = 1; i <= maxInstances; i++) {
    instances[i].clicked(mouseX,mouseY);
  }
}

function mouseReleased() {
  for(var i = 1; i <= maxInstances; i++) {
    instances[i].stopDragging();
  }
}

function Pendulum(origin_, length, mass, instance, angle, color, position) {
  this.origin = origin_.copy();
  this.position = position ? position : createVector();
  this.length = length;
  this.mass = mass;
  this.angle = angle;
  this.color = color ? color : "#9b9888";
  this.instance = parseInt(instance);

  this.aVelocity = 0.0;
  this.aAcceleration = 0.0;
  this.damping = 0.995; 
  this.ballr = mass;
  
  this.dragging = false;

  this.config = function() {
    return {
      mass: this.mass,
      length: this.length,
      offset: this.angle,
      color: this.color
    };
  }

  this.dragDisplay = function() {
    this.display();
    this.drag();
  }

  this.go = function() {
    this.update();
    this.display();
    this.drag();
  };

  this.update = function() {
    var gravity = 0.1 * 9.8;                                               
    this.aAcceleration = (-1 * gravity / this.length) * sin(this.angle);  
    this.aVelocity += this.aAcceleration;                            
    this.aVelocity *= this.damping;                                  
    this.angle += this.aVelocity;                                   
  };

  this.drag = function () {
    if (this.dragging) {
        var diff = p5.Vector.sub(this.origin, createVector(mouseX, mouseY));      
        this.angle = atan2(-1 * diff.y, diff.x) - radians(90);    
        displayPendulumAngle(this.angle);
    }
  };

  this.stopDragging = function () {
    this.aVelocity = 0; 
    this.dragging = false;
  };

  this.clicked = function (mx, my) {
    var d = dist(mx, my, this.position.x, this.position.y);
    if (d < this.ballr) {
        this.dragging = true;
        disableConfigControls(false);
        displayCurrentConfig(this.config());
        updateConfigPendulumTitle(this.instance);
    }
  };

  this.display = function() {
    this.position.set(this.length * sin(this.angle), this.length * cos(this.angle), 0);         
    this.position.add(this.origin);

    updatePosition(this.instance, this.position.x, this.position.y);

    stroke(this.color);
    strokeWeight(2);
    line(this.origin.x, this.origin.y, this.position.x, this.position.y);
    ellipseMode(CENTER);
    fill(this.color);

    if (this.dragging) {
      fill('#c66a0d');
    }
    
    ellipse(this.position.x, this.position.y, this.ballr, this.ballr);
  };
}
