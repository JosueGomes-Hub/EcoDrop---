import axios from "axios";
import { useEffect, useState } from "react";

function App() {
  const [usuarios, setUsuarios] = useState([]);

  useEffect(() => {
    axios
      .get("http://localhost:5000/usuarios")
      .then((response) => {
        setUsuarios(response.data);
      })
      .catch((error) => {
        console.log(error);
      });
  }, []);

  return (
    <div>
      <h1>Usuários</h1>

      {usuarios.map((user) => (
        <div key={user.id}>
          <p>{user.nome}</p>
          <p>{user.email}</p>
          <p>Pontos: {user.pontos}</p>
        </div>
      ))}
    </div>
  );
}

export default App;
