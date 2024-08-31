import { useLayoutEffect, useEffect, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DrawingContext } from '../../contexts/DrawingContext';
import stocotoonAPI from '../../axios/config';
import { UserContext } from '../../contexts/User';
import rough from 'roughjs/bundled/rough.esm';

import icons from "../../assets/drawingApp/index";

import "./DrawingApp.css";

import DrawingLayers from './DrawingLayers';
import DrawingFunctions from './DrawingFunctions';
import DrawingHistory from './DrawingHistory';
import TextModal from '../../components/TextModal';

function DrawingApp() {

  const navigate = useNavigate();

  const {
    layers, setLayers,
    layersQty, setLayersQty,
    selectedLayer, setSelectedLayer,
    selectedElements, setSelectedElements,
    layerIndex, setLayerIndex,
    action, setAction,
    tool, setTool,
    history, historyIndex,
    textConfigs, setTextConfigs,
    textModal, setTextModal,

  } = useContext(DrawingContext);

  const {session, setSession} = useContext(UserContext);

  const {
    createLayer,
    selectLayer,
    hideLayer,
    deleteLayer,
    upLayer,
    downLayer
  
  } = DrawingLayers();

  const { 
    createElement, 
    updateElement,
    getCanvasCoordinates, 
    getElementAtPosition, 
    adjustElementCoordinates, 
    cursorForPosition,
    resizedCoordinates,
    drawElement,
    createSelection,
    selectElements,
    resizeSelection,
    adjustSelectedLayer
  
  } = DrawingFunctions();

  const { updateHistory, undo, redo } = DrawingHistory();

  const [isFilled, setIsFilled] = useState(false);
  const [toolConfigs, setToolConfigs] = useState({
    stroke: "#FFFFFF",
    strokeWidth: 2,
    fill: "#121212",
    fillStyle: 'solid',
  });

  const [selectedArea, setSelectedArea] = useState({});

  // atualizar layers quando a selectedLayer é alterada
  useEffect(() => {

    const layersCopy = [...layers];
    layersCopy[layerIndex] = selectedLayer;
    setLayers(layersCopy);

  }, [selectedLayer]);

  useLayoutEffect(() => {

    const canvas = document.getElementById("canvas");
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height); // limpa o canvas

    const roughCanvas = rough.canvas(canvas);
    
    // sempre que a constante "elements" é alterada, o canvas é limpado e seu conteúdo é renderizado
    // novamente. Ele é renderizado usando o roughElement de cada elemento do canva, desenhando ele
    // através de roughCanvas.draw(roughElement)

    // a array layers precisa ser exibida ao contrário pois os últimos elementos renderizados 
    // sobrepoem os que foram renderizados anteriormente

    layers.slice().reverse().forEach(layer => {
      if (!layer.hidden && layer.elements) {
        layer.elements.slice().reverse().forEach(element => drawElement(roughCanvas, context,  element));
      }
    });

    if(selectedArea.roughElement && tool === "select"){
      roughCanvas.draw(selectedArea.roughElement);
    }

  }, [selectedLayer, layerIndex, layers, selectedArea, tool]); 

  useEffect(() => {

    layers.map(layer => {
      if(layer.hidden)
        document.getElementById(`layer-${layer.id}`).classList.add("hiddenLayer");
      else
      document.getElementById(`layer-${layer.id}`).classList.remove("hiddenLayer");
    });
    
  }, [layers]);

  const handleMouseDown = (event) => {

    if(selectedLayer.hidden) return;
    if(tool === "selection" && selectedLayer.elements.length === 0) return;

    const { mouseX, mouseY } = getCanvasCoordinates(event);

    if(tool === "selection"){
      const element = getElementAtPosition(mouseX, mouseY, selectedLayer.elements);
  
      if(element){
        const index = selectedLayer.elements.findIndex(({id}) => id === element.id);

        const elementsCopy = selectedLayer.elements.filter((_, i) => i !== index);
        const newElements = [element, ...elementsCopy];
  
        setSelectedLayer( selectedLayer => ({...selectedLayer, elements: newElements}));  

        if(element.type === "pencil"){
          const xOffsets = element.points.map(point => mouseX - point.x);
          const yOffsets = element.points.map(point => mouseY - point.y);
          setSelectedElements([{...element, xOffsets, yOffsets}]);
        }
        else{
          const offsetX = mouseX - element.x1;
          const offsetY = mouseY - element.y1;
          setSelectedElements([{...element, offsetX, offsetY}]);
        }
        if(element.position === "inside"){
          setAction("moving");
        }
        else{
          setAction("resizing");
        }
      } 
    }
    else if(tool === "select"){
      if(!selectedArea.x1){
        const area = createSelection(mouseX, mouseY, mouseX, mouseY);
        setSelectedArea(area);
        setAction("selecting");
      }
      else{
        const element = getElementAtPosition(mouseX, mouseY, [selectedArea]);
        if(element && selectedElements.length > 0){
          const newSelectedElements = selectedElements.map(element => {
            if(element.type === "pencil"){
              const xOffsets = element.points.map(point => mouseX - point.x);
              const yOffsets = element.points.map(point => mouseY - point.y);
              return({...element, xOffsets, yOffsets});
            }
            else{
              const offsetX = mouseX - element.x1;
              const offsetY = mouseY - element.y1;
              return ({...element, offsetX, offsetY});
            }
          });
          setSelectedElements(newSelectedElements);
          setAction("moving");
        }
        else{
          const area = createSelection(mouseX, mouseY, mouseX, mouseY);
          setSelectedArea(area);
          setAction("selecting");
        }
      }  
    }
    else if(["pencil", "rectangle", "line", "text"].includes(tool)){
      const id = selectedLayer.elements.length;
      let configs;
      if(tool === "pencil"){
        configs = {
          size: toolConfigs.strokeWidth * 4, 
          color: toolConfigs.stroke
        };
      }
      else if(tool === "text"){
        setTextModal(true);
        setAction("writing");
        configs = {...textConfigs};
      }
      else{
        configs = isFilled 
        ? {...toolConfigs} 
        : {...toolConfigs, fill: "rgba(0, 0, 0, 0)"};
      }
      const element = createElement(id, mouseX, mouseY, mouseX, mouseY, tool, configs);
      const newElements = [element, ...selectedLayer.elements];
      setSelectedLayer( prevState => ({...prevState, elements: newElements}));
      setSelectedElements([{...element}]);
      setAction(tool === "text" ? "writing" : "drawing");
    }
  }

  const handleMouseMove = (event) => {

    if(selectedLayer.hidden){
      document.getElementById("canvas").style.cursor = "not-allowed"
      return;
    }
    else
      document.getElementById("canvas").style.cursor = "crosshair"

    const { mouseX, mouseY } = getCanvasCoordinates(event);

    if(tool === "selection"){
      const element = getElementAtPosition(mouseX, mouseY, selectedLayer.elements);
      if(element)
        document.getElementById("canvas").style.cursor = cursorForPosition(element.position);
    }
    if(tool === "select" && selectedArea.x1 && selectedElements.length > 0){
      const element = getElementAtPosition(mouseX, mouseY, [selectedArea]);
      if(element)
        document.getElementById("canvas").style.cursor = "move";
    }

    if(action === "drawing"){
      const index = 0;
      const { id, x1, y1, configs } = selectedLayer.elements[index];
      updateElement(id, x1, y1, mouseX, mouseY, tool, configs);
    }
    else if(action === "moving"){
      selectedElements.map(selected => {
        if(selected.type === "pencil"){
          const newPoints = selected.points.map((_, index) => {
            return {
              x: mouseX - selected.xOffsets[index],
              y: mouseY - selected.yOffsets[index],
            }
          });
          const newElements = selectedLayer.elements;
          const index = selectedLayer.elements.findIndex(element => element.id === selected.id);
          newElements[index].points = newPoints;
          setSelectedLayer( prevState => ({...prevState, elements: newElements}));
        }
        else{
          const { id, x1, y1, x2, y2, type, offsetX, offsetY, configs } = selected;
          const width = x2 - x1;
          const height = y2 - y1; 
          const newX1 = mouseX - offsetX;
          const newY1 = mouseY - offsetY;
          updateElement(id, newX1, newY1, newX1 + width, newY1 + height, type, configs);
        }
      });
      if(tool === "select"){
        setSelectedArea({});
        document.getElementById("canvas").style.cursor = "move";
      }
    }
    else if(action === "resizing"){
      const { id, type, configs, position, ...coordinates} = selectedElements[0];
      const {x1, y1, x2, y2} = resizedCoordinates(mouseX, mouseY, position, coordinates);
      updateElement(id, x1, y1, x2, y2, type, configs);
    }
    else if(action === "selecting"){
      const { x1, y1 } = selectedArea;
      const newSelection = createSelection(x1, y1, mouseX, mouseY);
      setSelectedArea(newSelection);
    }
  }

  const handleMouseUp = (event) => {
    
    const { mouseX, mouseY } = getCanvasCoordinates(event);

    const newHistory = {
      layers,
      selectedLayer,
      layerIndex
    };
    updateHistory(newHistory);

    if(action === "writing") return;

    if(selectedElements.length === 1){
      if(selectedElements[0].type === "text" &&
        mouseX - selectedElements[0].offsetX === selectedElements[0].x1 &&
        mouseY - selectedElements[0].offsetY === selectedElements[0].y1
      ){
        setTextConfigs({...selectedLayer.elements[0].configs});
        setAction("writing");
        setTextModal(true);
        return;
      }
    }

    if(action === "drawing" || action === "resizing"){
      const index = 0;
      const {id, type, configs} = selectedLayer.elements[0];
      if(['line', 'rectangle'].includes(type)){
        const {x1, y1, x2, y2,} = adjustElementCoordinates(selectedLayer.elements[index]);
        updateElement(id, x1, y1, x2, y2, type, configs);
      }
    }
    else if(action === "selecting"){
      const {x1, y1, x2, y2} = adjustElementCoordinates(selectedArea);
      const newSelection = createSelection(x1, y1, x2, y2);
      setSelectedArea(newSelection);
      const newSelectedElements = selectElements(x1, y1, x2, y2, selectedLayer.elements);

      if(newSelectedElements.length > 0){

        const newSelectedArea = resizeSelection(newSelectedElements);
        setSelectedArea(newSelectedArea);
        setSelectedElements(newSelectedElements);
        // empurrar os elementos selecionados para a frente
        adjustSelectedLayer(newSelectedElements, selectedLayer.elements);
      }
      else{
        setSelectedArea({});
      }
    }
    else if(action === "moving"){
      setSelectedArea({});
      setSelectedElements([]);
    }
    console.log(layersQty);
    setAction("none");
  }

  const saveProject = async () => {

    let pageId = window.location.href;
    pageId = pageId.split('/')[4];

      try {
        const newContent = {
          layers,
          selectedLayer,
          layerIndex,
          layersQty
        };
        console.log(newContent);
        await stocotoonAPI.put(`/picture/save`, {
          content: newContent,
          PageId: pageId 
        }, {
            headers: {
                Authorization: `Bearer ${session.UserToken}`,
            }
        });
    } 
    catch (error) {
        console.log(error);
    }

  }
  
  return (
    <div className="drawing-app">
      {textModal && <TextModal/>}
      <div className="tools-container">
        <button
          className="draw-button tool"
          onClick={() => navigate(-1)}
        >
          <img src={icons.ComeBack}></img>
        </button>
        <button
          className="draw-button tool"
          onClick={saveProject}
        >
          <img src={icons.Save}></img>
        </button>
        <button 
          className={tool === "rectangle"
            ? "draw-button tool selectedTool" 
            : "draw-button tool"} 
          onClick={() => setTool("rectangle")}
        >
          <img src={icons.Square} alt="Square"/>
        </button>
        <button 
          className={tool === "line"
              ? "draw-button tool selectedTool" 
              : "draw-button tool"} 
          onClick={() => setTool("line")}
        >
          <img src={icons.Line} alt="Line"/>
        </button>
        <button 
          className={tool === "pencil"
            ? "draw-button tool selectedTool" 
            : "draw-button tool"} 
          onClick={() => setTool("pencil")}
        >
          <img src={icons.Brush} alt="Pencil"/>
        </button>
        <button
          className={tool === "text"
            ? "draw-button tool selectedTool" 
            : "draw-button tool"} 
          onClick={() => setTool("text")}
        >  
          <img src={icons.Text} alt="Pencil"/>
        </button>
        <button 
            className={tool === "selection"
              ? "draw-button tool selectedTool" 
              : "draw-button tool"} 
          onClick={() => setTool("selection")}
        >
          <img src={icons.Cursor} alt="Selection"/>
        </button>
        <button 
            className={tool === "select"
              ? "draw-button tool selectedTool" 
              : "draw-button tool"} 
          onClick={() => setTool("select")}
        >
          <img src={icons.Select} alt="Select"/>
        </button>
        <label htmlFor="stroke">Color</label>
        <input 
          value={toolConfigs.stroke}
          type="color" 
          id="stroke"
          onChange={(e) => setToolConfigs({...toolConfigs, stroke: e.target.value})}
        />
        <label htmlFor="strokeWidth">Width</label>
        <input 
          value={toolConfigs.strokeWidth}
          type="range" 
          min="1"
          max="8"
          id="strokeWidth"
          className="rangeInput"
          onChange={(e) => setToolConfigs({...toolConfigs, strokeWidth: e.target.value})}
        /><br/>
        <label htmlFor="isFilled">Fill</label>
        <button 
          className="fillButton" 
          onClick={() => setIsFilled(prevIsFilled => !prevIsFilled)}
        >
          {isFilled ? "+" : "-"}
        </button>
        {isFilled &&
          <input 
            value={toolConfigs.fill}
            type="color" 
            id="fill"
            onChange={(e) => {setToolConfigs({...toolConfigs, fill: e.target.value})}}
          />
        }
        <button 
          className={historyIndex === 0 ? "draw-button unable" : "draw-button"}
          onClick={undo} 
          style={{scale: "0.8"}}
        >
          <img src={icons.Undo} alt="Undo" />
        </button>
        <button 
          className={historyIndex === history.length-1 ? "draw-button unable" : "draw-button"}
          onClick={redo} 
          style={{scale: "0.8"}}
        >
          <img src={icons.Redo} alt="Redo" />
        </button>
      </div>
      <div className="canvas-container">
        <div className="layers-container">
          <div className="layers-box">
            <div className="layers-display">
              {layers.map((layer, index)  => (
                <div 
                  key={layer.id} 
                  className={layer.id === selectedLayer.id ? "layer selectedLayer" : "layer"} 
                  id={`layer-${layer.id}`}
                >
                  <div className="layer-name" onClick={() => selectLayer(layer.id)}>
                      {layer.name}
                  </div>
                  <button
                    className="draw-button hide-button"
                    onClick={() => hideLayer(index)}
                  >
                    <img 
                      className={layer.hidden && "hidden"} 
                      src={icons.View}
                      style={{width: "7px"}}
                      />
                  </button>
                </div>
              ))}
            </div>
            <div className="layer-buttons" key={selectedLayer.id}>
              <button 
                onClick={createLayer} 
                className="draw-button"
              >
                <img src={icons.Layer} alt="CreateLayer" />
              </button>
              <button onClick={() => deleteLayer(selectedLayer.id)} className="draw-button">
                <img src={icons.Trash} alt="DeleteLayer" />
              </button>
              <button onClick={() => upLayer(selectedLayer.id)} className="draw-button">
                <img src={icons.Arrow} alt="DeleteLayer" />
              </button>
              <button onClick={() => downLayer(selectedLayer.id)} className="draw-button">
                <img src={icons.Arrow} alt="DeleteLayer" style={{transform: "rotate(180deg)"}}/>
              </button>
            </div>
          </div>
        </div>
        <canvas
          id="canvas"
          width="1020"
          height="710"
          onPointerDown={handleMouseDown}
          onPointerMove={handleMouseMove}
          onPointerUp={handleMouseUp}
        >
        </canvas><br/>
      </div>
    </div>
  )
}

export const canvasContext = () => {
  return {
    canvas: document.getElementById("canvas"),
    context: canvas.getContext("2d")
  }
}


export default DrawingApp;
