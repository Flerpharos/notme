class StupidBallThing {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
  }
  
  display() {
    push();
    translate(this.x, this.y);
    strokeWeight(2);
    stroke("black");
    fill(this.color);
    circle(0, 0, 20);
    pop();
  }
}

class GolfThing extends StupidBallThing {
  constructor(x, y) {
    super(x, y, "yellow");
    this.vel = createVector(15, 0);
  }
  
  tick() {
    this.x += this.vel.x;
    this.y += this.vel.y;
    
    if (this.x > width - 10 || this.x < 10) this.vel.x *= -0.8;
    if (this.y > height - 10 || this.y < 10) this.vel.y *= -0.8;
    
    this.x = min(max(this.x, 10), width - 10);
    this.y = min(max(this.y, 10), height - 10);
    
    this.vel.mult(0.945);
    
    if (this.vel.mag() < 0.1) this.vel.mult(0);
  }
}

class PolyTrace {
  constructor(...points) {
    this.points = points;
  }
  
  draw() {
    push();
    background(100);
    noSmooth();
    text( "TIP! TRACE THE BLACK LINE OR YOU DIE", 250, 25)
    stroke(color(1, 1, 1));
    strokeWeight(10);
    noFill();
    beginShape();
    for (const point of this.points) {
      vertex(point.x, point.y);
    }
    endShape(CLOSE);
    pop();
    
  }
  
  inShape(x, y) {    
    
    if (!this.imageData) {
      this.imageData = document.querySelector("canvas").getContext('2d').getImageData(0, 0, document.querySelector("canvas").width, document.querySelector("canvas").height).data;
    }
    
    let index = (y * document.querySelector("canvas").width + x) * 4;
    
    //console.log({r: this.imageData[index], g: this.imageData[index + 1], b: this.imageData[index + 2]});
    
    return this.imageData[index] == 1 && this.imageData[index + 1] == 1 && this.imageData[index + 2] == 1; 
  }
}

class Button {
  
  constructor(x, y, text, width=null) {
    this.clicked = false;
    this.x = x;
    this.y = y;
    this.text = text;
    this.height = 20 * 2;
    this.width = width == null ? text.length * 10 + 10 : width;
    this.active = false;
  }
  
  display() {
    push();
    translate(this.x, this.y);
    stroke("white");
    strokeWeight(2);
    fill(this.active ? (this.clicked ? "#999" : "#555") : "black");
    rectMode(CENTER);
    rect(0, 0, this.width, this.height);
    
    strokeWeight(0);
    fill("white");
    textAlign(CENTER, CENTER);
    textSize(12);
    text(this.text, 0, 0);
    pop();
  }
  
  getState() {
    this.tick();
    return this.clicked();
  }
  
  tick() {
    if (mouseX > this.x - this.width / 2 &&
        mouseX < this.x + this.width / 2 &&
        mouseY > this.y - this.height / 2 &&
        mouseY < this.y + this.height / 2) {
      if (this.clicked && !mouseIsPressed) {
        this.clicked = false;
        this.onClick();
      } else if (mouseIsPressed) {
        this.clicked = true;
      }
      
      this.active = true;
    } else this.active = false;
  }
  
  onClick() {
    clickBoii.play();
    if (this.click != undefined) this.click();
  }
  
  setClicked(func) {
    this.click = func;
  }
}

const engine = Matter.Engine.create({
  constraintIterations: 20,
  positionIterations: 10,
  velocityIterations: 10,
  gravity: {
    x: 0, y: 0
  }
});
const world = engine.world;

let fuelTankTex;
let wingRightTex;
let wingLeftTex;
let thrusterTex;
let coneTex;

let scaleFactor = 0.1;
let locale = Matter.Vector.create(4000, 5000);
let offset = Matter.Vector.create(0, 0);
let mouseLast = null;
let paused = true;
let vroom = false;
let particles = [];

function createPlanetoid(x, y, r) {
  const body = Matter.Bodies.circle(x, y, r, {isStatic: true, label:"ground", friction: 0.5}, r / 100);
  body.gravMass = 4/3*Math.pow(r, 3)*0.1;
  
  body.gravity = function (bodyA, bodyB) {
    
    if (bodyA === bodyB) return;
    
    // use Newton's law of gravitation
    let bToA = Matter.Vector.sub(bodyB.position, bodyA.position),
        distanceSq = Matter.Vector.magnitudeSquared(bToA) || 0.0001,
        normal = Matter.Vector.normalise(bToA),
        magnitude = -0.0000001 * (bodyA.gravMass * bodyB.gravMass / distanceSq),
        force = Matter.Vector.mult(normal, magnitude);
    
    //console.log(force);

    // to apply forces to both bodies
    Matter.Body.applyForce(bodyA, bodyA.position, Matter.Vector.neg(force));
    Matter.Body.applyForce(bodyB, bodyB.position, force);
  };
  
  body.show = function () {
    push();
    fill("olivedrab");
    noStroke();
    circle(body.position.x, body.position.y, r * 2);
    
    pop();
  }
  
  return body;
}

function createAnchorPoint(x, y) {
  const body = Matter.Bodies.rectangle(x, y, 2, 2, {label: "anchor", isSensor: true});
  
  body.show = function () {
    push();
    fill("yellow");
    stroke("black");
    strokeWeight(2);
    circle(body.position.x, body.position.y, 10);
    noStroke();
    pop();
  }
  
  return body;
}

function createFuelTank(x, y) {
  const body = Matter.Bodies.rectangle(x, y, 200, 150, {label: "fuelTank", collisionFilter: {group: 0}, friction: 0.5, frictionAir: 0.00/**3**/, density: 0.5});
  
  body.show = function () {
    push();
    translate(body.position.x, body.position.y);
    rotate(body.angle);
    image(fuelTankTex, 0, 0);
    pop();
  }
  
  return body;
}
function createThruster(x, y) {
  const body = Matter.Bodies.rectangle(x, y, 200, 200, {label: "thruster", collisionFilter: {group: 0}, friction: 0.5, frictionAir: 0.00/**5**/, density: 0.5});
  
  body.show = function () {
    push();
    translate(body.position.x, body.position.y);
    rotate(body.angle);
    image(thrusterTex, 0, 0);
    pop();
  }
  
  return body;
}

function createWing(x, y, orientLeft=false) {
  const vertices = [{x:0,y:0},{x:200,y:0},{y:-200,x: orientLeft ? 0 : 200}];
  
  const body = Matter.Bodies.fromVertices(x, y, vertices, {label: "wing", collisionFilter: {group: 0}, friction: 0.5, frictionAir: 0.00/**1**/, density: 0.5});
  
  const o = 100/3;
  
  body.show = function () {
    //console.log(body.position);
    push();
    
    //console.log(offsets);
    
    translate(body.position.x, body.position.y);
    rotate(body.angle);
    image(orientLeft ? wingRightTex : wingLeftTex, orientLeft ?  o: -o, -o);
    pop();
  }
  
  return body;
}

function createCone(x, y) {
  const vertices = [{x:0,y:0},{x:200,y:0},{y:-200,x: 100}];
  
  const body = Matter.Bodies.fromVertices(x, y, vertices, {label: "cone", collisionFilter: {group: 0}, friction: 0.5, frictionAir: 0.00/**1**/, density: 0.5});
  
  const o = 100/3;
  
  body.show = function () {
    //console.log(body.position);
    push();
    
    //console.log(offsets);
    
    translate(body.position.x, body.position.y);
    rotate(body.angle);
    image(coneTex, 0, -o);
    pop();
  }
  
  return body;
}

let b;

let a, c, d;

let e;

let traceWin;

let state = "login"

let goalHorn;
let golfSplat;
let clickBoii;
let golfGreen;

let ball;
let ballDragging = false;
let goal;
let insaneMode = false;
let putts = 0;
let puttIsInit = false;
let trace = null;
let rocketTurning = 0;
    
function setGoal() {
  return createVector(random(50, width - 50), random(50, height - 50));
}

function puttBall(d) {
  if (ballDragging) {
    ballDragging = false;
    ball.vel = createVector(mouseX - ball.x, mouseY - ball.y).mult(d);
    golfSplat.play();
    putts ++;
  }
}

function preload() {
  soundFormats("mp3");
  goalHorn = loadSound("yay.mp3");
  golfSplat = loadSound("golfhit.mp3");
  clickBoii = loadSound("click.mp3");
  golfGreen = loadImage("index.png");
  
  
}

function setup() {
  createCanvas(800, 600);
  
  
  fuelTankTex = loadImage("fuel.png");
  wingRightTex = loadImage("wing.png");
  wingLeftTex = loadImage("wingleft.png");
  thrusterTex = loadImage("thruster.png");
  coneTex = loadImage("cone.png");
  
  Matter.Composite.add(world, createPlanetoid(0, 50000, 50000));
  
  Matter.Composite.add(world, createThruster(-100, -110));
  Matter.Composite.add(world, createThruster(100, -110));
  Matter.Composite.add(world, createFuelTank(0, -285));
  Matter.Composite.add(world, createFuelTank(0, -435));
  Matter.Composite.add(world, createWing(-166.67, -310));
  Matter.Composite.add(world, createWing(166.67, -300, true));
  Matter.Composite.add(world, createFuelTank(0, -585));
  Matter.Composite.add(world, createCone(0, -726));
  
  const anchors = Matter.Composite.allBodies(world).filter(b => b.label == "anchor");
  
  for (let i=0; i<anchors.length; i++) {
    for (let j=i+1; j<anchors.length; j++) {
      Matter.Composite.add(world, 
        Matter.Constraint.create({bodyA: anchors[i], bodyB: anchors[j], label:"base", stiffness: 1}));
    }
  }
  
  for (const body of Matter.Composite.allBodies(world)) {
    const {label} = body;
    
    switch (label) {
      case "anchor":
        continue;
      default:
        if (!body.gravMass) body.gravMass = body.mass;
        
        for (const anchor of anchors) {
          Matter.Composite.add(world,
            Matter.Constraint.create({bodyA:body, bodyB:anchor, stiffness: 1}));
        }  
    }
    }
  
  const parts = Matter.Composite.allBodies(world).filter(b => b.label !== "anchor" && b.label !== "ground");
  
  for (let i=0; i<parts.length; i++) {
    for (let j=i+1; j<parts.length; j++) {
      Matter.Composite.add(world, 
        Matter.Constraint.create({bodyA: parts[i], bodyB: parts[j], stiffness: 1}));
    }
  }
  
  b = new Button(width / 2, height * 2 / 3, "L O G I N   O L D   P E O P L E");
  b.setClicked(() => state="main");
  
  a = new Button(width / 2, height * 2 / 3, "P U Z Z L E   1 :   P U T T   P U T T", 300); 
  a.setClicked(() => state="putt");
  c = new Button(width / 2, height * 9 / 12, "P U Z Z L E   2 :   B U I L D   A   R O C K E T", 300);
  c.setClicked(() => state="rocket");
  d = new Button(width / 2, height * 10 / 12, "P U Z Z L E   3 :   I M A G E   T R A C E", 300);
  d.setClicked(() => state="trace");
  e = new Button(50, height - 30, "B A C K", 80);
  e.setClicked(() => {
    state="main";
    puttIsInit = false;
  });
  
  traceWin = new Button(150, height - 30, "F I N I S H", 100);
  traceWin.setClicked(() => {
        
      const imageData = document.querySelector("canvas").getContext('2d').getImageData(0, 0, document.querySelector("canvas").width, document.querySelector("canvas").height).data;
    
    let unfilled = 0;
    let wrong = 0;
    let correct = 0;
    
    for (let i=0; i<imageData.length; i+= 4) {
      if (imageData[i] == 1 && imageData[i + 1] == 1 && imageData[i + 2] == 1) unfilled ++;
      else if (imageData[i] == 220 && imageData[i + 1] == 20 && imageData[i + 2] == 60) wrong ++;
      else if (imageData[i] == 50 && imageData[i + 1] == 205 && imageData[i + 2] == 50) correct ++;
    }
    
    console.log(unfilled);
    console.log(wrong);
    console.log(correct);
    
    //console.log({r: this.imageData[index], g: this.imageData[index + 1], b: this.imageData[index + 2]});
    textAlign(LEFT)
    push();
    fill(100);
    noStroke();
    rect(10, 40, width - 10, 40);
    pop();
    text("SCORE: " + ((correct) / ((unfilled >> 1) + wrong)), 10, 60); 
  });
}

function draw() {
  //background(220);
  
  
  switch (state) {
    case "login":
      background(220);
      title();
      
      b.display();
      b.tick();
      break;
    case "main":
      background(220);
      title();
      
      a.display();
      a.tick();
      c.display();
      c.tick();
      d.display();
      d.tick();
      break;
    case "putt":
      {
        imageMode(CORNER);
        image(golfGreen, 0, 0, 800, 600);
        
        e.display();
        e.tick();
        
        if (!puttIsInit) {
          ball = new GolfThing(200, 200);
          goal = setGoal();
          puttIsInit = true;
          putts = 0;
        }
  
  fill("brown");
  circle(goal.x, goal.y, 23);
  
  if (ballDragging == true) {
    strokeWeight(5);
    stroke(255, 255, 100, 100);
    line(mouseX, mouseY, ball.x, ball.y);
  }
  
  ball.display();
  ball.tick();
  
  const d = dist(ball.x, ball.y, goal.x, goal.y);
        
  if (d < 4 && ball.vel.mag() < 0.01) {
    goalHorn.play();
    puttIsInit = false;
  }
  
  if (d < 4) {
    ball.vel = ball.vel.mult(0.7); 
    if (ball.vel.mag() < 0.25) { 
      ball.x = goal.x; 
      ball.y = goal.y; 
      ball.vel = createVector(0, 0);
    }
  } else if (d < 17) {
    ball.vel.add(
      createVector(goal.x - ball.x, goal.y - ball.y).normalize().mult(0.01*(22 - d)));
  } else if (d > 40 && insaneMode) {
    ball.vel.add(createVector(ball.x - goal.x, ball.y - goal.y).normalize().mult(0.2));
  }
  
  textAlign(RIGHT, TOP);
        fill(255);
        stroke(0);
        strokeWeight(4);
        textSize(35);
        text(putts, 30, 10);
        noStroke();
  
  
      } break;
      case "rocket":
      {
        
        if (!paused) Matter.Engine.update(engine, deltaTime);
  
  if (vroom && !paused) Matter.Composite.allBodies(world).filter(b => b.label == "thruster").forEach((t) => {
    //console.log(rocketTurning);
    particles.push({x: t.position.x, y: t.position.y, age: 0, dx: t.velocity.x, dy: t.velocity.y});
    Matter.Body.applyForce( t, {x: t.position.x, y: t.position.y}, {x: sin(t.angle + rocketTurning)*100, y: -cos(t.angle + rocketTurning)*100});
  });
  
        if (!paused)
  Matter.Composite.allBodies(world).filter(b => b.gravity !== undefined).forEach((t) => {
    Matter.Composite.allBodies(world).filter(b => !b.isStatic).forEach((a) => t.gravity(t, a));
  });
  
  background("lightskyblue");
  
  push();
        imageMode(CENTER);
  angleMode(RADIANS);
  // translate(locale.x*scaleFactor+offset.x*scaleFactor, locale.y*scaleFactor+offset.y*scaleFactor);
  scale(scaleFactor);
  translate(locale.x+offset.x, locale.y+offset.y);
        
          particles.filter(t => t.age < 200);
        
        
        if (!paused)
  for (const p of particles) {
    p.age += 2;
    
    p.x += p.dx;
    p.y += p.dy;
  }
        
  for (const p of particles) {
    
        let col = color(255, 119 + (255 - 119) * p.age / 200, 0 + 255 * p.age / 200);
    
    col.setAlpha(200 - p.age);
        push();
    noStroke();
    translate(p.x, p.y);
    fill(col);
    circle(0, 0, 600 * p.age / 200 + 00);
    pop();
  }
  
  Matter.Composite.allBodies(world).forEach((w) => {
    switch (w.label) {
      case "anchor":
      case "ground":
        break;
      default:
        w.show();

    }
  });
        
        
        

  
  Matter.Composite.allBodies(world).filter(b => b.label === "ground").forEach((w) => {
    w.show();
  });
        
          Matter.Composite.allBodies(world).forEach((w) => {
    switch (w.label) {
      case "anchor":
      case "ground":
        break;
      default:
        push();
                stroke("red");
        strokeWeight(40);
        line(w.position.x, w.position.y, w.position.x + w.velocity.x * 100, w.position.y + w.velocity.y * 100);
        stroke("blue");
        strokeWeight(20);
        line(w.position.x, w.position.y, w.position.x + w.force.x * 10, w.position.y + w.force.y * 10);
pop();
    }
  });
  
  // strokeWeight(2);
  // Matter.Composite.allConstraints(world).forEach((c) => {
  //   if (c.label == "base") stroke("red");
  //   else stroke("black");
  //   line(c.bodyA.position.x, c.bodyA.position.y,
  //       c.bodyB.position.x, c.bodyB.position.y);
  // });
  // noStroke();
  
  if (mouseIsPressed) {
    if (!mouseLast) {
      mouseLast = Matter.Vector.create(mouseX, mouseY);
      return;
    } else {
      locale = Matter.Vector.add(
        locale,
        Matter.Vector.div(
          Matter.Vector.sub(
            Matter.Vector.create(mouseX, mouseY),
            mouseLast),
          scaleFactor));

      mouseLast = Matter.Vector.create(mouseX, mouseY);
    }
  } else if (mouseLast) mouseLast = null;  
  
  pop();
        e.display();
        e.tick();
      } break;
      case "trace":
      {
        if (trace != null) {
        push();
        strokeWeight(7);
          //trace.inShape(0, 0);
          //console.log(trace.imageData.slice((mouseY * width + mouseX)*4, (mouseY * width + mouseX)*4 +4));
        //console.log(trace.inShape(mouseX, mouseY));
        if (mouseIsPressed) {
          if (trace.inShape(mouseX, mouseY)) {
            noStroke();
          fill("limegreen");
            circle(mouseX, mouseY, 10);
            //line(pmouseX, pmouseY, mouseX, mouseY);
          
        } else {
          stroke("crimson");
          line(pmouseX, pmouseY, mouseX, mouseY);
        }
          
          
        } 
        pop();
        }
        
        else {
          
          let points = [];
          
          for (let i=0; i<Math.random()*10 + 2; i++) {
            points.push(createVector(Math.random() * (width - 20) + 10, Math.random() * (height - 20) + 10));
          }
          
          trace = new PolyTrace(...points);
          
          trace.draw();
//           noStroke();
//           for (let i=0; i<width; i++) {
//             for (let j=0; j<height; j++) {
//               if (trace.inShape(i, j)) {
//           fill("limegreen");
//             circle(i, j, 7);
          
//         } else {
//           fill("crimson");
//           circle(i, j, 1);
//         }
//             }
          // }
        }
        
        
        
        e.display();
        e.tick();
        traceWin.display();
        traceWin.tick();
      } break;
  }
  
  
}

function title() {
  textSize(48);
  fill("black");
  textAlign(CENTER, CENTER);
  text("P R O B A B L Y   T H E R A P Y", width / 2, height / 3);

  textSize(24);
  text("NO REFUNDS", width / 2, height / 3 + 48);
}

function mousePressed() {
  if (state == "putt" && dist(mouseX, mouseY, ball.x, ball.y) < 10) {
    ballDragging = true;
    setTimeout(() => puttBall(insaneMode ? 0.5 : 0.2), random(100, 500));
  }
}

function mouseReleased() {
  if (state == "putt")
  puttBall(insaneMode ? 3 : 1.7);
}

function keyTyped(evt) {
   if (state != "rocket") return;
   
   let prevScale = scaleFactor;
  
  if (key == "p")
    paused = !paused;
  else if (key == "w")
    vroom = !vroom;
  else if (key == "d")
    rocketTurning = -PI/64;
  else if (key == "a")
    rocketTurning = PI/64;
  else if (key == "s")
    rocketTurning = 0;
  else if (key == "u")
    scaleFactor = min(100, max(0.01, scaleFactor - 0.003));
  else if (key == "j")
    scaleFactor = min(100, max(0.01, scaleFactor + 0.003));
  
    offset.x += width / 2 * (scaleFactor - prevScale);
  offset.y += height / 2 * (scaleFactor - prevScale);
}

function mouseWheel(evt) {
   if (state != "rocket") return;
   
  let prevScale = scaleFactor;
  
  scaleFactor = min(100, max(0.01, scaleFactor - evt.delta/3000));
  
  offset.x = offset.x * (scaleFactor / prevScale);
  offset.y = offset.y * (scaleFactor / prevScale);
  // console.log(scaleFactor);
}
