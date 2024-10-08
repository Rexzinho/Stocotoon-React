import { useState, useContext, useEffect } from "react";
import { UserContext } from "../../contexts/User";
import { Link } from "react-router-dom";
import stocotoonAPI from "../../axios/config";

import FormModal from "../../components/FormModal";
import Item from "../../components/Item";
import ChapterIcon from "../../assets/ChapterIcon.svg";
import CreateItem from "../../components/CreateItem";
import ItemContextMenu from "../../components/ItemContextMenu";

function Team() {

  const {session, setSession } = useContext(UserContext);
  const [chapters, setChapters] = useState([]);
  const [storyName, setStoryName] = useState("");
  const [currentChapter, setCurrentChapter] = useState({});
  const [storyId, setStoryId] = useState(null);
  const [modal, setModal] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [createMode, setCreateMode] = useState(false);

  const [contextMenu, setContextMenu] = useState(false);
  const [positionX, setPositionX] = useState(0);
  const [positionY, setPositionY] = useState(0)

  useEffect(() => {
    getData();
  }, []);

  const getData = async () => {
    let storyId = window.location.href;
    storyId = storyId.split("/")[4];
    setStoryId(storyId);
    try {
      const data = await stocotoonAPI.get(`/story/${storyId}`, {
        headers: {
          Authorization: `Bearer ${session.UserToken}`,
        },
      });
      setChapters(data.data.chapters);
      setStoryName(data.data.name)
      console.log(data.data.chapters);
    } catch (error) {
      console.log(error);
    }
  };

  const closeModal = () => {
    setModal(false);
    setName("");
    setDescription("");
    setMessage("");
  }

  const createChapter = async () => {
    const chapter = {
        name,
        description,
        StoryId: storyId
    }
    try {
        const resp = await stocotoonAPI.post("/chapter/create", chapter, {
            headers: {
                Authorization: `Bearer ${session.UserToken}`
            }
        });
        setChapters(prevChapters => [...prevChapters, resp.data.chapter]);
        closeModal();
    }
    catch (error) {
        setMessage(error.response.data.message);
    }
  } 

  const editChapter = async () => {
    console.log("editando...")
  }

  return (
    <div className="container pb-5 mt-nav">
      {contextMenu && 
        <ItemContextMenu
          setContextMenu={setContextMenu}
          positionX={positionX}
          positionY={positionY}
          name={"chapter"}
          type={currentChapter}
          handleClick={() => {
            setName(currentChapter.name)
            setDescription(currentChapter.description)
            setStoryId(currentChapter.id)
            setCreateMode(false)
            setModal(true)}}
        />
      }
      {modal && <FormModal 
        hide={closeModal}
        setName={setName} name={name}
        setDescription={setDescription} description={description}
        handleSubmit={createMode ? createChapter : editChapter}
        title="Criar Capítulo"
        nameLabel="Nome do capítulo"
        descriptionLabel="Descrição do capítulo"
        namePlaceholder="Digite o nome do capítulo"
        descriptionPlaceholder="Digite a descrição do capítulo"
        hasDescription={true}
        message={message}
        button={createMode ? "Criar" : "Editar"}
      />}
      <h1 className="text-light text-center pb-5 font-grand font-bold">
        {storyName}
      </h1>
      <div className="row">
        {chapters.map((chapter) => (
          <Item 
            name={"chapter"} 
            setName={setName}
            type={chapter} 
            icon={ChapterIcon}
            setPositionX={setPositionX}
            setPositionY={setPositionY}
            setContextMenu={setContextMenu}
            setCurrentItem={setCurrentChapter}
          />
        ))}
        <CreateItem name={"capítulo"} handleClick={() => {
          setCreateMode(true)
          setModal(true)}}/>
      </div>
    </div>
  );
}

export default Team;
