import { UserContext } from "../../contexts/User";

import React, { useState, useContext } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";

import MenuIcon from "../../assets/MenuIcon.svg";
import DefaultProfilePicture from "../../assets/DefaultProfilePicture.png";
import './Navbar.css';

const Navbar = () => {

  const basePath = useLocation().pathname.split('/').slice(0, 2).join('/');
  if (basePath === "/drawingApp") return null;

  const navigate = useNavigate();
  const { session, setSession } = useContext(UserContext);
  const [teams, setTeams] = useState(null);

  const sair = (e) => {
    e.preventDefault();

    localStorage.removeItem("session");
    setSession(null);

    navigate("/");
  };

  return (
    <nav
      className="navbar navbar-expand-lg fixed-top bg-gray1 border-bottom border-secondary font-inter"
      id="stocotoon-navbar"
    >
      <div className="container ">
        <Link
          to={"/"}
          className="navbar-brand text-cyan font-grand font-bold"
          id="navbar-logo"
        >
          Stocotoon
        </Link>
        <button
          className="navbar-toggler"
          data-bs-toggle="collapse"
          data-bs-target="#nav"
          aria-controls="nav"
          aria-label="Expand Navagation"
          id="menu-icon"
        >
          <img src={MenuIcon} alt="menu" />
        </button>
        <div className="collapse navbar-collapse text-center gap-3" id="nav">
          <ul className="navbar-nav gap-md-2 gap-lg-5 gap-3 mx-auto">
            <li className="nav-item pages-link">
              <Link to={"/"} className="nav-link text-light">
                Início
              </Link>
            </li> 
            {session && (
              <>
                <li className="nav-item pages-link">
                  <Link
                    to={`/dashboard/${session.UserId}`}
                    className="nav-link text-light"
                  >
                    Dashboard
                  </Link>
                </li>
                <li className="nav-item pages-link">
                    <Link
                      to={`/chat/`}
                      className="nav-link text-light"
                    >
                      Chat
                    </Link>
                </li>
              </>
            )}
          </ul>
          <div className="navbar-buttons navbar-nav gap-3 my-md-0 my-3 d-flex align-items-center">
            {!session ? (
              <>
                <Link to={"/entrar"} className="btn-outline-cyan">
                  Entrar
                </Link>
                <Link to={"/cadastro"} className="btn-cyan">
                  Inscrever-se
                </Link>
              </>
            ) : (
              <>
                <Link
                  to={"/seu-perfil"}
                  className="btn-outline-cyan"
                  onClick={(e) => sair(e)("AAA")}
                >
                  Sair
                </Link>
                <Link to={"/seu-perfil"} className="nav-link text-light d-flex align-items-center gap-3">
                  {session.Username}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
