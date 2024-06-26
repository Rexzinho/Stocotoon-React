import { useState, useContext, useEffect } from 'react';
import { UserContext } from '../contexts/User';
import { Link } from 'react-router-dom';
import stocotoonAPI from '../axios/config';

import Criar from '../assets/Criar.svg';
import StoryIcon from '../assets/StoryIcon.svg';

function Team() {

    const { session, setSession } = useContext(UserContext);
    const [stories, setStories] = useState(null);

    useEffect(() => {
        getData();
    }, []);

    const getData = async () => {
        let teamId = window.location.href;
        teamId = teamId.split('/')[4];
        try {
            const data = await stocotoonAPI.get(`/story/${teamId}`, {
                headers: {
                    Authorization: `Bearer ${session.UserToken}`,
                }
            });
            setStories(data.data);
            console.log(data.data);
        } 
        catch (error) {
            console.log(error);
        }
    }

  return (
    <div className="container pb-5">
        <h1 className="text-light text-center pb-5 font-grand font-bold">Histórias da equipe</h1>
        {stories !== null && 
            <div className="row">
            {stories.map(story => (
                <div className="col col-lg-2 col-sm-4 pb-5">
                    <div className="component">
                        <h2 className="text-light h6">{story.name}</h2>
                        <Link to={"/"}>
                            <img src={StoryIcon} alt="TeamIcon"/>
                        </Link>
                    </div>
                </div>
            ))} 
                <div className="col col-lg-2 col-sm-4 pb-5">
                        <div className="component">
                            <h2 className="text-light h6">Criar história</h2>
                            <Link to={`/`}>
                                <img src={Criar} alt="Criar"/>
                            </Link>
                        </div>
                </div>
            </div>}
    </div>
  )
}

export default Team;