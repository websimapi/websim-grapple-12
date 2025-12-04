import * as THREE from 'three';

export class TrackFactory {
    constructor() {
        const loader = new THREE.TextureLoader();
        
        // Road Texture
        this.roadTexture = loader.load('./asphalt_tile.png');
        this.roadTexture.wrapS = THREE.RepeatWrapping;
        this.roadTexture.wrapT = THREE.RepeatWrapping;
        this.roadTexture.repeat.set(1, 4);
        
        // Texture Filtering for smoother look
        this.roadTexture.minFilter = THREE.LinearMipmapLinearFilter;
        this.roadTexture.magFilter = THREE.LinearFilter;
        this.roadTexture.anisotropy = 16; 

        this.roadMat = new THREE.MeshStandardMaterial({ 
            map: this.roadTexture,
            roughness: 0.4, 
            metalness: 0.1, 
            color: 0x666666,
            side: THREE.DoubleSide // Ensure curved geometry is visible from all angles if flipped
        });

        // Post Assets
        const postTexture = loader.load('./post_texture.png');
        this.postGeo = new THREE.CylinderGeometry(0.8, 0.8, 6, 16);
        this.postMat = new THREE.MeshStandardMaterial({ 
            map: postTexture,
            color: 0xffffff, 
            emissive: 0xff4400,
            emissiveIntensity: 1.5,
            metalness: 0.8,
            roughness: 0.2
        });
    }

    createRoadMesh(width, length) {
        const geo = new THREE.PlaneGeometry(width, length);

        // Fix texture tiling based on length to prevent stretching
        const uvs = geo.attributes.uv;
        const tileFactor = length / 20; // 20 units per tile repeat
        for (let i = 0; i < uvs.count; i++) {
            uvs.setY(i, uvs.getY(i) * tileFactor);
        }
        geo.attributes.uv.needsUpdate = true;

        return new THREE.Mesh(geo, this.roadMat);
    }

    createCornerMesh(width, turnDir, radius) {
        // Create a curved road mesh (90 degrees)
        // We warp a PlaneGeometry to form a ring sector
        const segments = 32; // Increased segments for smoother large radius
        const geo = new THREE.PlaneGeometry(width, width, segments, 4);
        const pos = geo.attributes.position;
        const uvs = geo.attributes.uv;

        const innerRadius = radius - width / 2;
        const outerRadius = radius + width / 2;
        
        // Calculate arc length for UV scaling (approximate at centerline)
        const arcLength = radius * (Math.PI / 2);
        const uvScale = arcLength / 20; // 20 units per tile

        // turnDir: 1 (Left) or -1 (Right)
        
        for(let i=0; i<pos.count; i++) {
             const u = uvs.getX(i);
             const v = uvs.getY(i); // 0..1
             
             // Scale V for texture tiling
             uvs.setY(i, v * uvScale); 

             // Geometry warping
             // Map u (width) to radius r
             // Left Turn: u=0 is Inner (Right side of mesh? No, Left side).
             // PlaneGeometry: Left is -x (u=0), Right is +x (u=1).
             // Left Turn Center is to the Left. So u=0 is closest to center.
             // Right Turn Center is to the Right. So u=1 is closest to center.
             
             let r, theta, cx, cy;
             
             if (turnDir === 1) { // Left Turn
                 r = innerRadius + u * width;
                 
                 // Angle: Entry (Bottom) -> Exit (Left)
                 // Mesh Origin (0,0) is at the Intersection of Tangents
                 // Entry Start: (0, -radius) relative to Intersection
                 // Center of Curvature: (-radius, -radius) relative to Intersection
                 
                 cx = -radius;
                 cy = -radius;
                 
                 // Sweep 0 to PI/2
                 theta = v * (Math.PI / 2);
                 
             } else { // Right Turn
                 // Right Turn Center is to the Right
                 r = innerRadius + (1 - u) * width;
                 
                 cx = radius;
                 cy = -radius;
                 
                 // Sweep PI to PI/2 (Counter-Clockwise math)
                 // Start (Bottom): Angle PI
                 // End (Right): Angle PI/2
                 // v=0 -> Start. v=1 -> End.
                 theta = Math.PI - v * (Math.PI / 2);
             }
             
             const px = cx + r * Math.cos(theta);
             const py = cy + r * Math.sin(theta);
             
             // Z is 0 (Plane is XY)
             pos.setXYZ(i, px, py, 0);
        }
        
        geo.computeVertexNormals();
        geo.computeBoundingSphere();
        
        return new THREE.Mesh(geo, this.roadMat);
    }

    createPostMesh() {
        return new THREE.Mesh(this.postGeo, this.postMat);
    }
}