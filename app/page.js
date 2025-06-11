"use client";
import React, { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"; // Corrected import path

// Main App component
const Home = () => {
  const mountRef = useRef(null); // Reference to the canvas container
  const scene = useRef(null);
  const camera = useRef(null);
  const renderer = useRef(null);
  const tesseractMesh = useRef(null);
  const controls = useRef(null);
  const animationFrameId = useRef(null); // To store the animation frame ID for cleanup

  // Removed canvasWidth and canvasHeight states, as dimensions will be derived from mountRef

  // Function to resize canvas
  const handleResize = useCallback(() => {
    // Ensure mountRef.current and Three.js components are initialized
    if (mountRef.current && camera.current && renderer.current) {
      // Get the current dimensions of the container div
      const newWidth = mountRef.current.clientWidth;
      const newHeight = mountRef.current.clientHeight;

      // Update camera aspect ratio and projection matrix
      camera.current.aspect = newWidth / newHeight;
      camera.current.updateProjectionMatrix();

      // Update renderer size
      renderer.current.setSize(newWidth, newHeight);
    }
  }, []);

  // Function to create the tesseract geometry and lines
  const createTesseract = useCallback(() => {
    // Clear any existing tesseract mesh before creating a new one
    if (tesseractMesh.current) {
      scene.current.remove(tesseractMesh.current);
      tesseractMesh.current.geometry.dispose();
      tesseractMesh.current.material.dispose();
    }

    // Vertices of a 4D hypercube (tesseract)
    // A tesseract has 16 vertices, each with 4 coordinates (-1 or 1)
    const vertices = [];
    for (let i = 0; i < 16; i++) {
      const x = i & 1 ? 1 : -1;
      const y = i & 2 ? 1 : -1;
      const z = i & 4 ? 1 : -1;
      const w = i & 8 ? 1 : -1; // Fourth dimension coordinate
      vertices.push(new THREE.Vector4(x, y, z, w));
    }

    // Edges of a 4D hypercube
    // Two vertices are connected if they differ in exactly one coordinate (Hamming distance of 1)
    const edges = [];
    for (let i = 0; i < 16; i++) {
      for (let j = i + 1; j < 16; j++) {
        let diffCount = 0;
        if (vertices[i].x !== vertices[j].x) diffCount++;
        if (vertices[i].y !== vertices[j].y) diffCount++;
        if (vertices[i].z !== vertices[j].z) diffCount++;
        if (vertices[i].w !== vertices[j].w) diffCount++;

        if (diffCount === 1) {
          // If only one coordinate differs, they are connected
          edges.push([i, j]);
        }
      }
    }

    // Project 4D vertices to 3D space for visualization
    // A simple perspective projection is used, where the 'w' (4th) coordinate
    // influences the scaling, creating a 'cube within a cube' appearance.
    const projectedVertices = vertices.map((v) => {
      const distance = 2; // Arbitrary distance from the 4D viewpoint
      // The 'd' factor creates a perspective effect based on the w-coordinate.
      // Vertices further in the w-dimension will appear smaller.
      const d = 1 / (distance - v.w);

      return new THREE.Vector3(v.x * d, v.y * d, v.z * d);
    });

    // Create BufferGeometry to hold line positions and colors
    const geometry = new THREE.BufferGeometry();
    const positions = []; // Array to store XYZ coordinates of line segments
    const colors = []; // Array to store RGB colors for each vertex
    const color = new THREE.Color(); // Helper for color manipulation

    // Iterate through each edge and add its vertices to the positions array
    edges.forEach(([v1_idx, v2_idx]) => {
      const p1 = projectedVertices[v1_idx];
      const p2 = projectedVertices[v2_idx];

      positions.push(p1.x, p1.y, p1.z); // Add coordinates for the first vertex of the segment
      positions.push(p2.x, p2.y, p2.z); // Add coordinates for the second vertex of the segment

      // Assign a consistent blueish color to all segments for visual clarity
      color.setHSL(0.6, 0.7, 0.5); // Hue, Saturation, Lightness
      colors.push(color.r, color.g, color.b); // Add RGB values for the first vertex
      colors.push(color.r, color.g, color.b); // Add RGB values for the second vertex
    });

    // Set the 'position' attribute for the geometry
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    // Set the 'color' attribute for the geometry
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    // Material for drawing lines
    const material = new THREE.LineBasicMaterial({
      vertexColors: true, // Enable per-vertex coloring
      linewidth: 2, // Note: linewidth has no effect on WebGLRenderer, line thickness is often done with shaders
    });

    // Create a LineSegments object (for drawing individual line segments)
    tesseractMesh.current = new THREE.LineSegments(geometry, material);
    // Add the tesseract mesh to the scene
    scene.current.add(tesseractMesh.current);

    return tesseractMesh.current;
  }, []);

  // Initial setup for the Three.js scene (runs once on component mount)
  useEffect(() => {
    // Scene initialization
    scene.current = new THREE.Scene();
    scene.current.background = new THREE.Color(0x1a1a2e); // Set a dark background color

    // Camera setup
    // Initial aspect ratio is set to 1 to prevent distortion before actual dimensions are known
    camera.current = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.current.position.z = 3; // Position the camera slightly back to view the tesseract

    // Renderer setup
    renderer.current = new THREE.WebGLRenderer({ antialias: true }); // Enable anti-aliasing for smoother lines
    renderer.current.setPixelRatio(window.devicePixelRatio); // Set pixel ratio for high-DPI displays

    // Append the renderer's DOM element (canvas) to the mountRef container
    if (mountRef.current) {
      // Ensure mountRef is not null
      mountRef.current.appendChild(renderer.current.domElement);
    }

    // Call handleResize immediately to set the initial size and aspect ratio of the renderer
    handleResize();

    // OrbitControls setup for interactive camera movement
    controls.current = new OrbitControls(
      camera.current,
      renderer.current.domElement
    );
    controls.current.enableDamping = true; // Enable damping for smoother camera movement
    controls.current.dampingFactor = 0.05; // Damping intensity
    controls.current.screenSpacePanning = false; // Disable panning in 2D
    controls.current.minDistance = 2; // Minimum zoom distance
    controls.current.maxDistance = 10; // Maximum zoom distance
    controls.current.maxPolarAngle = Math.PI / 2; // Limit vertical rotation to prevent flipping

    // Add the tesseract geometry to the scene
    createTesseract();

    // Add event listener for window resize to make the visualization responsive
    window.addEventListener("resize", handleResize);

    // Cleanup function for useEffect (runs on component unmount)
    return () => {
      window.removeEventListener("resize", handleResize); // Remove resize listener
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current); // Stop animation loop
      }
      if (renderer.current) {
        renderer.current.dispose(); // Dispose of the renderer
        // Safely remove the canvas element from the DOM
        if (
          mountRef.current &&
          mountRef.current.contains(renderer.current.domElement)
        ) {
          mountRef.current.removeChild(renderer.current.domElement);
        }
      }
      if (controls.current) {
        controls.current.dispose(); // Dispose of OrbitControls
      }
      if (tesseractMesh.current) {
        scene.current.remove(tesseractMesh.current);
        tesseractMesh.current.geometry.dispose();
        tesseractMesh.current.material.dispose();
      }
      // Nullify references to prevent memory leaks
      scene.current = null;
      camera.current = null;
      renderer.current = null;
      controls.current = null;
    };
  }, [createTesseract, handleResize]); // Dependencies: recreate scene if these functions change

  // Animation loop (updates the tesseract's rotation every frame)
  const animate = useCallback(() => {
    animationFrameId.current = requestAnimationFrame(animate); // Request next animation frame

    // Rotate the tesseract mesh on X and Y axes
    if (tesseractMesh.current) {
      tesseractMesh.current.rotation.x += 0.005;
      tesseractMesh.current.rotation.y += 0.005;
    }

    // Update OrbitControls (required if damping or autoRotate is enabled)
    if (controls.current) {
      controls.current.update();
    }

    // Render the scene from the camera's perspective
    if (renderer.current && scene.current && camera.current) {
      renderer.current.render(scene.current, camera.current);
    }
  }, []);

  // Start animation loop once the component is mounted
  useEffect(() => {
    animate();
  }, [animate]); // Dependency: restart animation if 'animate' function changes

  return (
    // Main container, centered using flexbox and occupying full screen height
    <div className="w-full h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4 font-inter">
      <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-center text-indigo-400">
        Rotating Tesseract Visualization
      </h1>
      <p className="text-sm sm:text-base text-gray-300 mb-8 max-w-2xl text-center">
        This visualization displays a 3D projection of a 4D tesseract rotating.
        In 4D space, the tesseract is rigid, but its 3D projection appears to
        deform as it rotates. Use your mouse to rotate the view.
      </p>
      {/* Container for the Three.js canvas, centered horizontally and responsive */}
      <div
        ref={mountRef}
        className="relative bg-gray-800 rounded-xl shadow-2xl overflow-hidden w-full max-w-4xl mx-auto h-[60vh] aspect-video"
      >
        {/* The Three.js canvas element will be appended here dynamically */}
      </div>
      <div className="mt-8 text-center text-gray-400 text-xs sm:text-sm">
        *The interactive model allows you to rotate the 3D projection using your
        mouse, giving you a more dynamic sense of the tesseract's form.*
      </div>
    </div>
  );
};
export default Home;
