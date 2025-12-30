/**
 * SlideElementRenderer - Renders slide elements (text, image, shapes, qrcode)
 */

import React from 'react';
import { Lock, RotateCw, QrCode } from 'lucide-react';
import ContentEditableText from './ContentEditableText';
import type { SlideElement } from './types';
import { RESIZE_HANDLES } from './types';

interface SlideElementRendererProps {
    element: SlideElement;
    isSelected: boolean;
    isEditing: boolean;
    isDragging: boolean;
    isResizing: boolean;
    isRotating: boolean;
    onElementMouseDown: (e: React.MouseEvent, element: SlideElement) => void;
    onResizeMouseDown: (e: React.MouseEvent, handle: string) => void;
    onRotationMouseDown: (e: React.MouseEvent, element: SlideElement) => void;
    onSelect: (id: string) => void;
    onStartEditing: (id: string) => void;
    onUpdateElement: (id: string, updates: Partial<SlideElement>) => void;
    onSaveTextSelection: () => void;
    onStopEditing: () => void;
}

// Line/Arrow Element Renderer
export const renderLineElement = (
    element: SlideElement,
    isSelected: boolean,
    isDragging: boolean,
    onElementMouseDown: (e: React.MouseEvent, element: SlideElement) => void,
    onResizeMouseDown: (e: React.MouseEvent, handle: string) => void,
    onRotationMouseDown: (e: React.MouseEvent, element: SlideElement) => void,
    onSelect: (id: string) => void
) => {
    const lineWidth = element.style?.lineWidth || 2;
    const lineColor = element.style?.borderColor || '#1e293b';
    const lineStyle = element.style?.lineStyle || 'solid';
    const isArrow = element.type === 'arrow';
    const arrowSize = element.style?.arrowSize || 10;

    const dashArray = lineStyle === 'dashed' ? '8,4' : lineStyle === 'dotted' ? '2,4' : undefined;

    return (
        <div
            key={element.id}
            style={{
                position: 'absolute',
                left: element.x,
                top: element.y,
                width: element.width,
                height: Math.max(element.height, 20),
                transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
                transformOrigin: 'center center',
                cursor: element.locked ? 'not-allowed' : (isDragging ? 'grabbing' : 'grab'),
                zIndex: element.zIndex,
            }}
            onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onElementMouseDown(e, element);
            }}
            onClick={(e) => {
                e.stopPropagation();
                onSelect(element.id);
            }}
        >
            <svg
                width={element.width}
                height={Math.max(element.height, 20)}
                style={{
                    overflow: 'visible',
                    outline: isSelected ? '2px solid #3b82f6' : undefined,
                    outlineOffset: '2px',
                    pointerEvents: 'none',
                }}
            >
                {isArrow && (
                    <defs>
                        <marker
                            id={`arrowhead-${element.id}`}
                            markerWidth={arrowSize}
                            markerHeight={arrowSize}
                            refX={arrowSize - 1}
                            refY={arrowSize / 2}
                            orient="auto"
                        >
                            <polygon
                                points={`0 0, ${arrowSize} ${arrowSize / 2}, 0 ${arrowSize}`}
                                fill={lineColor}
                            />
                        </marker>
                    </defs>
                )}
                <line
                    x1={0}
                    y1={Math.max(element.height, 20) / 2}
                    x2={element.width}
                    y2={Math.max(element.height, 20) / 2}
                    stroke={lineColor}
                    strokeWidth={lineWidth}
                    strokeDasharray={dashArray}
                    markerEnd={isArrow ? `url(#arrowhead-${element.id})` : undefined}
                />
            </svg>

            {isSelected && !element.locked && (
                <>
                    {/* Resize handles */}
                    <div
                        onMouseDown={(e) => onResizeMouseDown(e, 'w')}
                        style={{
                            position: 'absolute',
                            left: -5,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: 10,
                            height: 10,
                            backgroundColor: '#3b82f6',
                            border: '2px solid white',
                            borderRadius: '50%',
                            cursor: 'ew-resize',
                            zIndex: 10,
                        }}
                    />
                    <div
                        onMouseDown={(e) => onResizeMouseDown(e, 'e')}
                        style={{
                            position: 'absolute',
                            right: -5,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: 10,
                            height: 10,
                            backgroundColor: '#3b82f6',
                            border: '2px solid white',
                            borderRadius: '50%',
                            cursor: 'ew-resize',
                            zIndex: 10,
                        }}
                    />
                    {/* Rotation handle */}
                    <div
                        onMouseDown={(e) => onRotationMouseDown(e, element)}
                        style={{
                            position: 'absolute',
                            top: -35,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: 20,
                            height: 20,
                            backgroundColor: '#10b981',
                            border: '2px solid white',
                            borderRadius: '50%',
                            cursor: 'grab',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        }}
                        title={`Rotazione: ${Math.round(element.rotation || 0)}°`}
                    >
                        <RotateCw className="w-3 h-3 text-white" />
                    </div>
                    {/* Rotation line */}
                    <div
                        style={{
                            position: 'absolute',
                            top: -25,
                            left: '50%',
                            width: 2,
                            height: 20,
                            backgroundColor: '#10b981',
                            transform: 'translateX(-50%)',
                            zIndex: 9,
                        }}
                    />
                </>
            )}

            {element.locked && (
                <div style={{
                    position: 'absolute',
                    top: -20,
                    right: 0,
                    background: '#f1f5f9',
                    borderRadius: 4,
                    padding: '2px 4px',
                }}>
                    <Lock className="w-3 h-3 text-slate-500" />
                </div>
            )}
        </div>
    );
};

// Main Element Renderer Component
const SlideElementRenderer: React.FC<SlideElementRendererProps> = ({
    element,
    isSelected,
    isEditing,
    isDragging,
    isResizing,
    isRotating,
    onElementMouseDown,
    onResizeMouseDown,
    onRotationMouseDown,
    onSelect,
    onStartEditing,
    onUpdateElement,
    onSaveTextSelection,
    onStopEditing,
}) => {
    // Use line renderer for line/arrow types
    if (element.type === 'line' || element.type === 'arrow') {
        return renderLineElement(
            element,
            isSelected,
            isDragging,
            onElementMouseDown,
            onResizeMouseDown,
            onRotationMouseDown,
            onSelect
        );
    }

    const baseStyle: React.CSSProperties = {
        position: 'absolute',
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
        cursor: element.locked ? 'not-allowed' : (isDragging ? 'grabbing' : 'grab'),
        zIndex: element.zIndex,
        outline: isSelected ? '2px solid #3b82f6' : undefined,
        outlineOffset: '2px',
    };

    const contentStyle: React.CSSProperties = {
        width: '100%',
        height: '100%',
        backgroundColor: element.style?.backgroundColor,
        border: element.style?.borderWidth
            ? `${element.style.borderWidth}px solid ${element.style.borderColor}`
            : undefined,
        borderRadius: element.type === 'ellipse' ? '50%' : element.style?.borderRadius,
        fontSize: element.style?.fontSize,
        fontFamily: element.style?.fontFamily,
        color: element.style?.color,
        textAlign: element.style?.textAlign,
        fontWeight: element.style?.fontWeight,
        fontStyle: element.style?.fontStyle,
        display: 'flex',
        alignItems: 'center',
        justifyContent: element.style?.textAlign === 'center' ? 'center'
            : element.style?.textAlign === 'right' ? 'flex-end' : 'flex-start',
        padding: element.type === 'text' ? '8px' : undefined,
        overflow: 'hidden',
    };

    return (
        <div
            key={element.id}
            data-element-id={element.id}
            style={baseStyle}
            onMouseDown={(e) => {
                // Don't block drag if editing
                if (isEditing) return;
                e.stopPropagation();
                e.preventDefault();
                onElementMouseDown(e, element);
            }}
            onClick={(e) => {
                e.stopPropagation();
                if (!isDragging && !isResizing && !isRotating) {
                    onSelect(element.id);
                }
            }}
            onDoubleClick={(e) => {
                if (element.type === 'text') {
                    e.stopPropagation();
                    onStartEditing(element.id);
                }
            }}
        >
            <div style={contentStyle}>
                {element.type === 'text' && (
                    isEditing ? (
                        <ContentEditableText
                            elementId={element.id}
                            initialContent={element.content || ''}
                            style={element.style}
                            onSave={(html) => onUpdateElement(element.id, { content: html })}
                            onBlur={() => {
                                onSaveTextSelection();
                                setTimeout(() => {
                                    onStopEditing();
                                }, 200);
                            }}
                            onMouseUp={onSaveTextSelection}
                            onEscape={onStopEditing}
                        />
                    ) : (
                        <div
                            dangerouslySetInnerHTML={{ __html: element.content || '' }}
                            style={{
                                pointerEvents: 'none',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                            }}
                        />
                    )
                )}
                {element.type === 'image' && element.src && (
                    <img
                        src={element.src}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        draggable={false}
                    />
                )}
                {element.type === 'qrcode' && (
                    <div
                        style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px dashed #94a3b8',
                            borderRadius: 4,
                            backgroundColor: '#f8fafc',
                            position: 'relative',
                        }}
                    >
                        <QrCode className="w-8 h-8 text-slate-400" />
                        <div style={{
                            position: 'absolute',
                            bottom: 4,
                            left: 0,
                            right: 0,
                            textAlign: 'center',
                            fontSize: 10,
                            color: '#64748b',
                        }}>
                            QR Code Verifica
                        </div>
                    </div>
                )}
            </div>

            {isSelected && !element.locked && !isEditing && (
                <>
                    {/* Resize handles */}
                    {RESIZE_HANDLES.map((handle) => (
                        <div
                            key={handle}
                            onMouseDown={(e) => onResizeMouseDown(e, handle)}
                            style={{
                                position: 'absolute',
                                width: handle.length === 1 ? 8 : 10,
                                height: handle.length === 1 ? 8 : 10,
                                backgroundColor: '#3b82f6',
                                border: '2px solid white',
                                borderRadius: '50%',
                                cursor: `${handle}-resize`,
                                zIndex: 10,
                                ...(handle.includes('n') ? { top: -5 } : {}),
                                ...(handle.includes('s') ? { bottom: -5 } : {}),
                                ...(handle.includes('w') ? { left: -5 } : {}),
                                ...(handle.includes('e') ? { right: -5 } : {}),
                                ...(handle === 'n' || handle === 's' ? { left: '50%', transform: 'translateX(-50%)' } : {}),
                                ...(handle === 'e' || handle === 'w' ? { top: '50%', transform: 'translateY(-50%)' } : {}),
                            }}
                        />
                    ))}
                    {/* Rotation handle */}
                    <div
                        onMouseDown={(e) => onRotationMouseDown(e, element)}
                        style={{
                            position: 'absolute',
                            top: -35,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: 20,
                            height: 20,
                            backgroundColor: '#10b981',
                            border: '2px solid white',
                            borderRadius: '50%',
                            cursor: 'grab',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        }}
                        title={`Rotazione: ${Math.round(element.rotation || 0)}°`}
                    >
                        <RotateCw className="w-3 h-3 text-white" />
                    </div>
                    {/* Rotation line */}
                    <div
                        style={{
                            position: 'absolute',
                            top: -25,
                            left: '50%',
                            width: 2,
                            height: 20,
                            backgroundColor: '#10b981',
                            transform: 'translateX(-50%)',
                            zIndex: 9,
                        }}
                    />
                </>
            )}

            {element.locked && (
                <div style={{
                    position: 'absolute',
                    top: -20,
                    right: 0,
                    background: '#f1f5f9',
                    borderRadius: 4,
                    padding: '2px 4px',
                }}>
                    <Lock className="w-3 h-3 text-slate-500" />
                </div>
            )}
        </div>
    );
};

export default SlideElementRenderer;
