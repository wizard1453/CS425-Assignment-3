var scene = null;
var maxDepth = 1;
var background_color = [190/255, 210/255, 215/255];
var ambientToggle = true;
var diffuseToggle = true;
var specularToggle = true;
var reflectionToggle = true;
var bias = 0.001;

class Ray {
    constructor(origin, direction) {
        this.origin = origin;
        this.direction = direction;
    }
}

class Intersection {
    constructor(distance, point) {
        this.distance = distance;
        this.point = point;
    }
}

class Hit {
    constructor(intersection, object) {
        this.intersection = intersection;
        this.object = object;
    }
}

/*
    Intersect objects
*/
function raySphereIntersection(ray, sphere) {

    var center = sphere.center;
    var radius = sphere.radius;

    var light  = sub(ray.origin,center);
    /* d^2 * t^2 + 2*d*(e-c)t + (e-c)(e-c) - R^2 = 0*/
    var a = dot(ray.direction, ray.direction)
    var b = 2 * dot(ray.direction, light);
    var c  = dot(light,light) - Math.pow(radius,2);
    var discriminant = b*b - 4*a*c;

    // Compute intersection

    // If there is a intersection, return a new Intersection object with the distance and intersection point:
    // E.g., return new Intersection(t, point);
    if(discriminant == 0) {
        var t = - b / 2 * a;
        var p = add(ray.origin, mult(ray.direction, t));
        if(t<=0) return null;

        p = sub(p, mult(ray.direction, bias));
        return new Intersection(t, p);
    } else if(discriminant>0) {
        var p;
        var r;

        var r1 = (-b + Math.sqrt(discriminant)) / (2*a);
        var r2 = (-b - Math.sqrt(discriminant)) / (2*a);

        if (r1<=0||r2<=0) return null;

        var p1 = add(ray.origin, mult(ray.direction, r1));
        var p2 = add(ray.origin, mult(ray.direction, r2));
        /* find closest point intersected */
        p = p1 > p2 ? p2 : p1;
        r = p1 > p2 ? r1: r2;

        p = sub(p, mult(ray.direction, bias));

        return new Intersection(r, p);
    }

    // If no intersection, return null
    else if(discriminant<0) return null;
}

function rayPlaneIntersection(ray, plane) {

    /* ((e + td) - p0) * n = 0 */
    var p0 = plane.center;
    var e = ray.origin;
    var n = normalize(plane.normal);
    var d = ray.direction;

    // Compute intersection

    // If there is a intersection, return a dictionary with the distance and intersection point:
    // E.g., return new Intersection(t, point);
    if(!dot(n,d)==0) {
        var t = dot(sub(p0, e), n) / dot(n, d);
        if(t<=0) return 0;

        var p = add(e, mult(d, t));
        p = sub(p, mult(ray.direction, bias));

        return new Intersection(t, p);
    }
    // If no intersection, return null
    else return null;

}

function intersectObjects(ray, depth) {


    // Loop through all objects, compute their intersection (based on object type and calling the previous two functions)
    // Return a new Hit object, with the closest intersection and closest object
    var closest_obj = new Hit(new Intersection(Infinity, Infinity), null);
    for (var i = 0; i < scene.objects.length; i++) {
        var object = scene.objects[i];
        var current_intersection = null;

        if (object.type == 'sphere') {
            current_intersection = raySphereIntersection(ray, object);
        } else if (object.type == 'plane') {
            current_intersection = rayPlaneIntersection(ray, object);
        }

        if(current_intersection!= null && current_intersection.distance < closest_obj.intersection.distance) {
            closest_obj = new Hit(current_intersection, object);
        }
    }

    // If no hit, retur null
    if (closest_obj.object == null) {
        return null;
    } else return closest_obj;

}

function sphereNormal(sphere, pos) {
    // Return sphere normal
    return normalize(sub(pos, sphere.center));
}

/*
    Shade surface
*/
function shade(ray, hit, depth) {

    var object = hit.object;
    var color = [0,0,0];
    
    
    // Compute object normal, based on object type
    // If sphere, use sphereNormal, if not then it's a plane, use object normal
    var normal;

    if (object.type == 'sphere') {
        // normal = normalize(object.normal);
        normal = sphereNormal(object, hit.intersection.point);
    } else {
        normal = normalize(object.normal);
    }

    // Loop through all lights, computing diffuse and specular components *if not in shadow*
    var diffuse = 0;
    var specular = 0;

    for(var i = 0; i < scene.lights.length; i++) {
        var light = scene.lights[i];

        var light_dir = normalize(sub(light.position, hit.intersection.point));
        var h = normalize(add(light_dir, mult(ray.direction, -1)));

        if (!isInShadow(hit.intersection.point, light.position)) {
            diffuse += object.diffuseK * dot(light_dir, normal);
            specular += object.specularK * Math.pow(dot(h, normal), object.specularExponent);
        }

        var total = 0;
    }

    var enhancement;
    enhancement = 1; /* for scene-2 */
    // enhancement = 200; /* for scene-1 */

    if (ambientToggle == true) {
        total += object.ambientK * enhancement;
    }
    // console.log(total);
    if (diffuseToggle == true) {
        total += diffuse * enhancement;
    }
    // console.log(total);
    if(specularToggle == true){
        total  += specular * enhancement;
    }
    // console.log(total);
    // Combine colors, taking into account object constants
    color = add(color, mult(object.color, total));
    // Handle reflection, make sure to call trace incrementing depth
    if(depth < maxDepth && reflectionToggle ==true){
        // var reflect_dir = reflected(mult(ray.direction,-1),normal);
        var ref_ray = mult(ray.direction, -1);
        var ref_direct = mult(normal, dot(ref_ray, normal));
        // var reflect_dir = normalize(ref_direct, ref_ray); -- test
        var reflect_dir = normalize(sub(mult(ref_direct, 2), ref_ray));

        var reflect_ray = new Ray(hit.intersection.point, reflect_dir); 
        var reflect_color = trace(reflect_ray,depth+1);
        if(reflect_color ==null){
            return color;
        } 
        else{
            return  add(color,mult(reflect_color,object.reflectiveK));
        }
    }

    return color;
}


/*
    Trace ray
*/
function trace(ray, depth) {
    if(depth > maxDepth) return background_color;
    var hit = intersectObjects(ray, depth);
    if(hit != null) {
        var color = shade(ray, hit, depth);
        return color;
    }
    return null;
}

function isInShadow(hit, light) {

    // Check if there is an intersection between the hit.intersection.point point and the light
    // If so, return true
    // If not, return false
    var direction = normalize(sub(light, hit));
    var ray = new Ray(hit, direction);
    var intersection = intersectObjects(ray, 1);

    if (intersection != null && intersection.intersection.distance > 0) return true;
    else return false;
}

/*
    Render loop
*/
function render(element) {
    if(scene == null)
        return;
    
    var width = element.clientWidth;
    var height = element.clientHeight;
    element.width = width;
    element.height = height;
    scene.camera.width = width;
    scene.camera.height = height;

    var ctx = element.getContext("2d");
    var data = ctx.getImageData(0, 0, width, height);

    var eye = normalize(sub(scene.camera.direction,scene.camera.position));
    var right = normalize(cross(eye, [0,1,0]));
    var up = normalize(cross(right, eye));
    var fov = ((scene.camera.fov / 2.0) * Math.PI / 180.0);

    var halfWidth = Math.tan(fov);
    var halfHeight = (scene.camera.height / scene.camera.width) * halfWidth;
    var pixelWidth = (halfWidth * 2) / (scene.camera.width - 1);
    var pixelHeight = (halfHeight * 2) / (scene.camera.height - 1);

    for(var x=0; x < width; x++) {
        for(var y=0; y < height; y++) {
            var vx = mult(right, x*pixelWidth - halfWidth);
            var vy = mult(up, y*pixelHeight - halfHeight);
            var direction = normalize(add(add(eye,vx),vy));
            var origin = scene.camera.position;

            var ray = new Ray(origin, direction);
            var color = trace(ray, 0);
            if(color != null) {
                var index = x * 4 + y * width * 4;
                data.data[index + 0] = color[0];
                data.data[index + 1] = color[1];
                data.data[index + 2] = color[2];
                data.data[index + 3] = 255;
            }
        }
    }
    console.log("done");
    ctx.putImageData(data, 0, 0);
}

/*
    Handlers
*/
window.handleFile = function(e) {
    var reader = new FileReader();
    reader.onload = function(evt) {
        var parsed = JSON.parse(evt.target.result);
        scene = parsed;
    }
    reader.readAsText(e.files[0]);
}

window.updateMaxDepth = function() {
    maxDepth = document.querySelector("#maxDepth").value;
    var element = document.querySelector("#canvas");
    render(element);
}

window.toggleAmbient = function() {
    ambientToggle = document.querySelector("#ambient").checked;
    var element = document.querySelector("#canvas");
    render(element);
}

window.toggleDiffuse = function() {
    diffuseToggle = document.querySelector("#diffuse").checked;
    var element = document.querySelector("#canvas");
    render(element);
}

window.toggleSpecular = function() {
    specularToggle = document.querySelector("#specular").checked;
    var element = document.querySelector("#canvas");
    render(element);
}

window.toggleReflection = function() {
    reflectionToggle = document.querySelector("#reflection").checked;
    var element = document.querySelector("#canvas");
    render(element);
}

/*
    Render scene
*/
window.renderScene = function(e) {
    var element = document.querySelector("#canvas");
    render(element);
}