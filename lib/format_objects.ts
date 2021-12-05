// -*- mode: typescript; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Genie
//
// Copyright 2019-2020 The Board of Trustees of the Leland Stanford Junior University
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>

/**
 * A plain text message.
 */
export interface Text {
    type : 'text';
    text : string;
}

/**
 * A rich deep link (also known as a card).
 *
 * An RDL is expected to be displayed as a clickable card with optional
 * description and picture.
 */
export interface RDL {
    type : 'rdl';
    callback ?: string;
    webCallback : string;
    displayTitle : string;
    displayText ?: string;
    pictureUrl ?: string;
}

/**
 * A short notification sound from a predefined library.
 */
export interface SoundEffect {
    type : 'sound';
    name : string;
    exclusive ?: boolean;
}

/**
 * A picture, video, or music file.
 */
export interface Media {
    type : 'picture'|'audio'|'video';
    url : string;
    alt ?: string;
}

/**
 * A button that triggers a pre-parsed ThingTalk command.
 */
export interface Button {
    type : 'button';
    title : string;
    json : string;
}

/**
 * A button that answers a multiple-choice question.
 */
export interface Choice {
    type : 'choice';
    title : string;
    idx : number;
}

/**
 * A button that navigates within the assistant app, or
 * triggers an app action such as configuring a new skill.
 */
export interface Link {
    type : 'link';
    title : string;
    url : string;
}

export type FormattedObject = (RDL | SoundEffect | Media | Text | Button | Choice | Link) & {
    toLocaleString(locale : string) : string;
};
