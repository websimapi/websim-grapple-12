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

    createCornerMesh(width, turnDir) {
        // Create a curved road mesh (90 degrees) using a warped PlaneGeometry
        // This ensures the UVs follow the curve properly
        const segments = 16;
        const geo = new THREE.PlaneGeometry(width, width, segments, 1);
        const pos = geo.attributes.position;
        const uvs = geo.attributes.uv;

        // turnDir: 1 (Left) or -1 (Right)
        
        for(let i=0; i<pos.count; i++) {
             const u = uvs.getX(i);
             const v = uvs.getY(i); // 0..1
             
             // Scale V for texture tiling (Corners are short, ~1/4 of straight repeat)
             // Original material repeat is Y=4. We want ~1 tile for the corner.
             uvs.setY(i, v * 0.25); 

             // Geometry warping
             // Map square (u,v) to Polar (r, theta)
             
             let r, theta, cx, cy;
             
             if (turnDir === 1) { // Left Turn
                 // Inner edge is Left (u=0), Outer is Right (u=1) ? 
                 // No, standard plane u=0 is Left (-x), u=1 is Right (+x).
                 // For a Left turn, the center is to the Left.
                 // So Left Edge (u=0) is Inner (r=0). Right Edge (u=1) is Outer (r=width).
                 
                 r = u * width;
                 
                 // Angle: Entry (Bottom) -> Exit (Left)
                 // Entry vector relative to center (-w/2, -w/2) is (w/2, 0) -> Angle 0
                 // Exit vector relative to center is (0, w/2) -> Angle PI/2
                 theta = v * (Math.PI / 2);
                 
                 cx = -width/2;
                 cy = -width/2;
                 
             } else { // Right Turn
                 // Center is to the Right.
                 // Left Edge (u=0) is Outer (r=width). Right Edge (u=1) is Inner (r=0).
                 r = (1 - u) * width;
                 
                 // Angle: Entry (Bottom) -> Exit (Right)
                 // Entry vector relative to center (w/2, -w/2) is (-w/2, 0) -> Angle PI
                 // Exit vector relative to center is (0, w/2) -> Angle PI/2
                 // We sweep PI -> PI/2
                 theta = Math.PI - v * (Math.PI / 2);
                 
                 cx = width/2;
                 cy = -width/2;
             }
             
             const px = cx + r * Math.cos(theta);
             const py = cy + r * Math.sin(theta);
             
             pos.setXYZ(i, px, py, 0);
        }
        
        geo.computeVertexNormals();
        
        // Fix bounding sphere for culling
        geo.computeBoundingSphere();
        
        return new THREE.Mesh(geo, this.roadMat);
    }

    createPostMesh() {
        return new THREE.Mesh(this.postGeo, this.postMat);
    }
}