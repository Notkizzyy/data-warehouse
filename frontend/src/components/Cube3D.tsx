import React, { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';

interface CubeData {
  x_dim: string;
  y_dim: string;
  z_dim: string;
  value: number;
}

interface Cube3DProps {
  data: CubeData[];
  xDim: string;
  yDim: string;
  zDim: string;
  measure: string;
  formatCurrency: (val: number) => string;
}

const colorPalette = [
  '#6366f1', // indigo-500
  '#22c55e', // green-500
  '#eab308', // yellow-500
  '#ec4899', // pink-500
  '#a855f7', // purple-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
];

const BoxNode = ({ position, color, item, formatCurrency, xDim, yDim, zDim, measure, setHoveredNode }: any) => {
  const mesh = useRef<THREE.Mesh>(null);
  const [hovered, setHover] = useState(false);

  return (
    <mesh
      position={position}
      ref={mesh}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
        setHoveredNode(item);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHover(false);
        setHoveredNode(null);
      }}
    >
      <boxGeometry args={[1.0, 1.0, 1.0]} />
      <meshStandardMaterial color={hovered ? '#ffffff' : color} transparent opacity={hovered ? 1 : 0.9} />
    </mesh>
  );
};

export const Cube3D: React.FC<Cube3DProps> = ({ data, xDim, yDim, zDim, measure, formatCurrency }) => {
  const [hoveredNode, setHoveredNode] = useState<CubeData | null>(null);

  // Extract unique values and sort
  const xValues = Array.from(new Set(data.map(d => d.x_dim?.toString() || 'Unknown'))).sort();
  const yValues = Array.from(new Set(data.map(d => d.y_dim?.toString() || 'Unknown'))).sort();
  const zValues = Array.from(new Set(data.map(d => d.z_dim?.toString() || 'Unknown'))).sort();

  const xSize = xValues.length;
  const ySize = yValues.length;
  const zSize = zValues.length;

  const getZColor = (zValue: string) => {
    const idx = zValues.indexOf(zValue);
    return colorPalette[idx % colorPalette.length];
  };

  return (
    <div className="w-full h-full relative flex">
      {/* Tooltip Overlay */}
      {hoveredNode && (
        <div className="absolute top-4 left-4 z-10 bg-[#0a192f]/95 border border-white/20 p-4 rounded-xl shadow-2xl pointer-events-none min-w-[200px]">
          <h4 className="text-[#64ffda] font-bold mb-2 pb-2 border-b border-white/10 uppercase text-xs tracking-wider">Detail Dimensi</h4>
          <div className="space-y-1 text-sm text-gray-200">
            <p><span className="text-gray-400 capitalize inline-block w-20">{xDim}:</span> {hoveredNode.x_dim}</p>
            <p><span className="text-gray-400 capitalize inline-block w-20">{yDim}:</span> {hoveredNode.y_dim}</p>
            <p><span className="text-gray-400 capitalize inline-block w-20">{zDim}:</span> {hoveredNode.z_dim}</p>
            <div className="pt-2 mt-2 border-t border-white/10 font-semibold text-white flex justify-between">
              <span className="capitalize">{measure}:</span>
              <span>{measure === 'transaksi' ? hoveredNode.value : formatCurrency(hoveredNode.value)}</span>
            </div>
          </div>
        </div>
      )}

      {/* 3D Canvas */}
      <div className="flex-1 h-full cursor-grab active:cursor-grabbing">
        <Canvas camera={{ position: [xSize * 2.5 + 5, Math.max(ySize, 8) * 1.5 + 5, zSize * 2.5 + 5], fov: 45 }}>
          <ambientLight intensity={0.6} />
          <pointLight position={[20, 20, 20]} intensity={0.8} />
          <pointLight position={[-20, -20, -20]} intensity={0.2} color="#4f46e5" />
          <OrbitControls makeDefault enableDamping dampingFactor={0.05} autoRotate autoRotateSpeed={1.5} />
          
          <group position={[0, 0, 0]}>
            {/* Draw wireframe shells (cangkang) for all possible intersections */}
            {Array.from({ length: xSize }).map((_, xi) => 
              Array.from({ length: ySize }).map((_, yi) => 
                Array.from({ length: zSize }).map((_, zi) => {
                  const px = (xi - (xSize - 1) / 2) * 1.5; 
                  const py = (yi - (ySize - 1) / 2) * 1.5;
                  const pz = (zi - (zSize - 1) / 2) * 1.5;
                  return (
                    <mesh key={`wire-${xi}-${yi}-${zi}`} position={[px, py, pz]}>
                      <boxGeometry args={[1.4, 1.4, 1.4]} />
                      <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.15} />
                    </mesh>
                  );
                })
              )
            )}

            {data.map((item, i) => {
              const xVal = item.x_dim?.toString() || 'Unknown';
              const yVal = item.y_dim?.toString() || 'Unknown';
              const zVal = item.z_dim?.toString() || 'Unknown';

              const xIdx = xValues.indexOf(xVal);
              const yIdx = yValues.indexOf(yVal);
              const zIdx = zValues.indexOf(zVal);
              
              // Center the grid around origin (0,0,0)
              const px = (xIdx - (xSize - 1) / 2) * 1.5; 
              const py = (yIdx - (ySize - 1) / 2) * 1.5;
              const pz = (zIdx - (zSize - 1) / 2) * 1.5;

              return (
                <BoxNode 
                  key={i}
                  position={[px, py, pz]} 
                  color={getZColor(zVal)}
                  item={item}
                  xDim={xDim}
                  yDim={yDim}
                  zDim={zDim}
                  measure={measure}
                  formatCurrency={formatCurrency}
                  setHoveredNode={setHoveredNode}
                />
              )
            })}
          </group>
        </Canvas>
      </div>
    </div>
  );
};
