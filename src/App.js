import React, { useState, useEffect, FormEvent } from "react";
import {
  Button,
  Flex,
  Heading,
  Image,
  Text,
  TextField,
  View,
  withAuthenticator,
} from '@aws-amplify/ui-react';
import "./App.css";
import "@aws-amplify/ui-react/styles.css";
import { listNotes } from "../src/graphql/queries";
import {
  createNote as createNoteMutation,
  deleteNote as deleteNoteMutation,
} from "./graphql/mutations";
import { getUrl, uploadData, remove } from 'aws-amplify/storage';
import { generateClient } from "aws-amplify/api";
import { getCurrentUser } from 'aws-amplify/auth';
import { v4 as uuidv4 } from 'uuid';
const client = generateClient();

const App = ({ signOut }) => {
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    fetchNotes();
  }, []);

  async function fetchNotes() {
    const username = await currentAuthenticatedUser();
    if (!username) {
      setNotes([]);
      return;
    }
    console.log(username);
    const apiData = await client.graphql({ 
      query: listNotes
    });
    const notesFromAPI = apiData.data.listNotes;
    
    await Promise.all(
      notesFromAPI.map(async (note) => {
        if (note.image) {
          const url = await getUrl({ key: note.id });
          note.image = url.url;  
          console.log("fetch image: ", note.image)
        }
        return note;
      })
    );
    setNotes(notesFromAPI);
  }
  async function currentAuthenticatedUser() {
    try {
      const { username } = await getCurrentUser();
      return username;
    } catch (err) {
      return null;
    }
  }

  async function createNote(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    const image = form.get("image");
    const username = await currentAuthenticatedUser();
    if(!username){
      console.log("get username failed");
    }
    const uuid = uuidv4();
    const data = {
      id: uuid,
      name: form.get("name"),
      description: form.get("description"),
      image: uuid,
      owner: username,
    };
    if (!!data.image) await uploadData({
      key: uuid,
      data: image
    });
    await client.graphql({
      query: createNoteMutation,
      variables: { input: data },
    });
    fetchNotes();
    event.target.reset();
  }

  async function deleteNote({ id, name }) {
    const newNotes = notes.filter((note) => note.id !== id);
    setNotes(newNotes);
    await remove({ key: name });
    await client.graphql({
      query: deleteNoteMutation,
      variables: { input: { id } },
    });
  }

  return (
    <View className="App">
      <Heading level={1}>My Notes App</Heading>
      <View as="form" margin="3rem 0" onSubmit={createNote}>
        <Flex direction="row" justifyContent="center">
          <TextField
            name="name"
            placeholder="Note Name"
            label="Note Name"
            labelHidden
            variation="quiet"
            required
          />
          <TextField
            name="description"
            placeholder="Note Description"
            label="Note Description"
            labelHidden
            variation="quiet"
            required
          />
          <Button type="submit" variation="primary">
            Create Note
          </Button>
        </Flex>
        <View
          name="image"
          as="input"
          type="File"
          style={{ alignSelf: "end" }}
        />
      </View>
      <Heading level={2}>Current Notes</Heading>
      <View margin="3rem 0">
        {notes.map((note) => (
          <Flex
            key={note.id || note.name}
            direction="row"
            justifyContent="center"
            alignItems="center"
          >
            <Text as="strong" fontWeight={700}>
              {note.name}
            </Text>
            <Text as="span">{note.description}</Text>
            {note.image && (
              <Image
                src={note.image}
                alt={`visual aid for ${notes.name}`}
                style={{ width: 400 }}
              />
            )}
            <Button variation="link" onClick={() => deleteNote(note)}>
              Delete note
            </Button>
          </Flex>
        ))}
      </View>
      <Button onClick={signOut}>Sign Out</Button>
    </View>
  );
};

export default withAuthenticator(App);