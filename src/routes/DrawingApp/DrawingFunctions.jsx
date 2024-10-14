import { useContext } from 'react';
import { DrawingContext } from '../../contexts/DrawingContext';

import rough from 'roughjs/bundled/rough.esm';
const generator = rough.generator();

import { getSvgPathFromStroke } from './DrawingFreeHand';
import getStroke from 'perfect-freehand';

import { canvasContext } from "./DrawingApp";

const DrawingFunctions = () => {

  const { selectedLayer, setSelectedLayer, action} = useContext(DrawingContext);
  
  const createElement = (id, x1, y1, x2, y2, tool, configs) => {

    let roughElement;

    switch(tool){
      case "line":
        const lineSets = {stroke: configs.stroke, strokeWidth: configs.strokeWidth}
        roughElement = generator.line(x1, y1, x2, y2, {...lineSets});
        return { id, x1, y1, x2, y2, type: tool, roughElement, configs: {...lineSets}};
      case "rectangle":
        roughElement = generator.rectangle(x1, y1, x2-x1, y2-y1, {...configs}); 
        return { id, x1, y1, x2, y2, type: tool, roughElement, configs};
      case "ellipse":
        roughElement = generator.ellipse(((x1+x2)/2), ((y1+y2)/2), x2-x1, y2-y1, {...configs}); 
        return { id, x1, y1, x2, y2, type: tool, roughElement, configs};
      case "pencil":
        return {id, type: tool, points: [{x: x1, y: y1}], configs};
      case "text":
        return {id, type: tool, x1, y1, x2, y2, configs}
      default:
        throw new Error(`Tool not recognised: ${tool}`);
    }
    
    // o routhElement, que se encontra dentro de cada um dos objetos de elements, serve para criar o
    // elemento usando roughCanvas.draw(roughElement)
  }
  
  const updateElement = (id, x1, y1, x2, y2, tool, configs) => {

    const newElements = selectedLayer.elements;
    const index = selectedLayer.elements.findIndex(element => element.id === id);

    switch(tool){
      case "line":
      case "rectangle":
      case "ellipse":
        newElements[index] = createElement(id, x1, y1, x2, y2, tool, configs);
        break;
      case "pencil":
        newElements[index].points = [...newElements[index].points, {x: x2, y: y2}];
        break;
      case "text":
        if(action === "writing"){
          const { canvas } = canvasContext();
          const textWidth = canvas.getContext("2d").measureText(configs.text).width;
          newElements[index].x2 = newElements[index].x1 + textWidth;
          newElements[index].y2 = newElements[index].y1 + Number(configs.fontSize);
          newElements[index].configs = configs;
        }
        else{
          newElements[index] = createElement(id, x1, y1, x2, y2, tool, configs);
        }
        break;
      default:
        throw new Error (`Tool not recognized: ${tool}`);
    }

    setSelectedLayer( selectedLayer => ({...selectedLayer, elements: newElements}));
  }

  const drawElement = (roughCanvas, context, element) => {
    switch(element.type){
      case "line":
      case "rectangle":
      case "ellipse":
        roughCanvas.draw(element.roughElement);
        break;
      case "pencil":
        const stroke = getSvgPathFromStroke(getStroke(element.points, element.configs));
        context.fillStyle = element.configs.color;
        context.fill(new Path2D(stroke));
        break;
      case "text":
        const {text, fontSize, font, fillStyle} = element.configs;
        context.textBaseline = "top"
        context.font = fontSize + "px " + font;
        context.fillStyle = fillStyle;
        context.fillText(text, element.x1, element.y1);
        break;
      default:
        throw new Error(`Type not recognized: ${element.type}`);
    }
  }

  const getCanvasCoordinates = (event) => {
  
      const context = document.getElementById("canvas").getContext("2d");
    
      const mouseX = event.clientX - context.canvas.offsetLeft;
      const mouseY = event.clientY - context.canvas.offsetTop;
    
      return {mouseX, mouseY}
  }

  const onLine = (x1, y1, x2, y2, x, y, maxDistance = 1) => {
    const a = {x: x1, y: y1};
    const b = {x: x2, y: y2};
    const c = {x, y};
    const offset = distance(a, b) - (distance(a, c) + distance(b, c));
    return Math.abs(offset) < maxDistance ? "inside" : null;
  }

  const positionWithinElement = (x, y, element) => {

    const { type, x1, y1, x2, y2 } = element;
    
    switch(type){
      case "line":  
        const on = onLine(x1, y1, x2, y2, x, y);
        const start = nearPoint(x, y, x1, y1, "start");
        const end = nearPoint(x, y, x2, y, "end");
        return start || end || on;
      case "rectangle":
      case "ellipse":
        const topLeft = nearPoint(x, y, x1, y1, "tl");
        const topRight = nearPoint(x, y, x2, y1, "tr");
        const bottomLeft = nearPoint(x, y, x1, y2, "bl");
        const bottomRight = nearPoint(x, y, x2, y2, "br");
        const inside = x >= x1 && x <= x2 && y >= y1 && y <= y2 ? "inside" : null;
        return topLeft || topRight || bottomLeft || bottomRight || inside;
      case "pencil":
        const betweenAnyPoint = element.points.some((point, index) => {
          const nextPoint = element.points[index + 1];
          if(!nextPoint) return false;
          return onLine(point.x, point.y, nextPoint.x, nextPoint.y, x, y, element.configs.size) !== null;
        });
        return betweenAnyPoint ? "inside" : null;
        case "text":
        return x >= x1 && x <= x2 && y >= y1 && y <= y2 ? "inside" : null;
      default:
        throw new Error(`Type not recognized: ${type}`);
    }
  }
    
  const distance = (a, b) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
    
  const getElementAtPosition = (x, y, elements) => {
      return elements
        .map(element => ({...element, position: positionWithinElement(x, y, element)}))
        .find(element => element.position !== null);
  }
    
  const adjustElementCoordinates = element => {
      const {type, x1, y1, x2, y2} = element;
      if(type === "rectangle" || type === "ellipse"){
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);
        return {x1: minX, y1: minY, x2: maxX, y2: maxY}
      }
      else{
        if(x1 < x2 || (x1 === x2 && y1 < y2)){
          return {x1, y1, x2, y2}
        }
        else{
          return {x1: x2, y1: y2, x2: x1, y2: y1}
        }
      }
  }
    
  const nearPoint = (x, y, x1, y1, name) => {
      return Math.abs(x - x1) < 5 && Math.abs(y - y1) < 5 ? name: null;
  }
    
  const cursorForPosition = position => {
      switch(position){
        case "tl":
        case "br":
        case "start":
        case "end":
          return "nwse-resize";
        case "tr":
        case "bl":
          return "nesw-resize";
        default:
          return "move";
      }
  }

  const resizedCoordinates = (mouseX, mouseY, position, coordinates) => {

    const { x1, y1, x2, y2 } = coordinates;

    switch(position){
      case "tl":
      case "start":
        return { x1: mouseX, y1: mouseY, x2, y2 };
      case "tr":
        return { x1, y1: mouseY, x2: mouseX, y2 };
      case "bl":
        return { x1: mouseX, y1, x2, y2: mouseY }
      case "br":
      case "end":
        return { x1, y1, x2: mouseX, y2: mouseY }
      default:
        return null;
    }
  }

  

  const createSelection = (x1, y1, x2, y2) => {
    const roughElement = generator.rectangle(x1, y1, x2-x1, y2-y1, {
      stroke: "#00F0FF",
      fill: "#00c3ff2a",
      fillStyle: 'solid',
    }); 
    return {x1, y1, x2, y2, type: "rectangle", roughElement}
  }

  const selectElements = (x1, y1, x2, y2, elements) => {
    return elements.filter(element => {
      switch(element.type){
        case "rectangle":
        case "ellipse":
        case "text":
          if(
            ((element.x1 >= x1 && element.x1 <= x2 && element.y1 >= y1 && element.y1 <= y2) ||
            (element.x2 >= x1 && element.x2 <= x2 && element.y2 >= y1 && element.y2 <= y2)) 
            || 
            ((element.x2 >= x1 && element.x2 <= x2 && element.y1 >= y1 && element.y1 <= y2) ||
            (element.x1 >= x1 && element.x1 <= x2 && element.y2 >= y1 && element.y2 <= y2))
          )
            return element;
          break;
        case "line":
          if(
            ((element.x1 >= x1 && element.x1 <= x2 && element.y1 >= y1 && element.y1 <= y2) ||
            (element.x2 >= x1 && element.x2 <= x2 && element.y2 >= y1 && element.y2 <= y2)) 
          )
            return element;
          break;
        case "pencil":
          if(element.points.some(
            point => point.x >= x1 && point.x <= x2 && point.y >= y1 && point.y <= y2
          ))
            return element;
          break;
        default:
          throw new Error (`type not recognized: ${element.type}`);
      }
    });
  }

  const resizeSelection = elements => {
    const first = elements[0]
    let minX = first.x1 || first.points[0].x;
    let maxX = first.x2 || first.points[0].x;
    let minY = first.y1 || first.points[0].y;
    let maxY = first.y2 || first.points[0].y;
    elements.map((element) => {
        if(element.type === "pencil"){
          element.points.map(({x, y}) => {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          });
        }
        else{
          minX = Math.min(minX, element.x1);
          maxX = Math.max(maxX, element.x2);
          if(element.y1 > element.y2){
            minY = Math.min(minY, element.y2);
            maxY = Math.max(maxY, element.y1);
          }
          else{
            minY = Math.min(minY, element.y1);
            maxY = Math.max(maxY, element.y2);
          }
        }
      }
    );
    const newSelectedArea = createSelection(minX, minY, maxX, maxY);
    return newSelectedArea;
  }

  const adjustSelectedLayer = (selectedElements, elements) => {
    let newElements = elements.filter(element => !selectedElements.includes(element));
    newElements = [...selectedElements, ...newElements];
    setSelectedLayer(prevState => ({...prevState, elements: newElements}));
  }

  return { createElement, updateElement, drawElement, getCanvasCoordinates, getElementAtPosition, adjustElementCoordinates, cursorForPosition, resizedCoordinates, createSelection, selectElements, resizeSelection, adjustSelectedLayer }
}

export default DrawingFunctions;