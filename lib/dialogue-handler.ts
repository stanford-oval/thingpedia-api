// -*- mode: typescript; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Thingpedia
//
// Copyright 2021 The Board of Trustees of the Leland Stanford Junior University
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

import { Type } from "thingtalk";

import { FormattedObject } from "./format_objects";

/**
 * Interface for handling dialogues in a Thingpedia skill as raw sentences.
 *
 * This interface allows a Thingpedia device to override all parsing of commands
 * into ThingTalk and handle raw utterances from the user.
 * It is mainly useful for search engines and other question-answering systems.
 */
interface DialogueHandler<AnalysisType extends DialogueHandler.CommandAnalysisResult, StateType> {
    /**
     * The priority of this dialogue handler.
     *
     * At runtime, all configured devices that expose this interface will be queried
     * in parallel for each command, and the devices with the highest priority that
     * reports high confidence will be chosen to reply to the user.
     */
    priority : DialogueHandler.Priority;

    /**
     * Initialize this dialogue handler for a new conversation.
     *
     * The dialogue handler can optionally produce a reply to show to the user immediately.
     * This can be a reply to a previous user command (if `initialState` is not undefined,
     * so the conversation is being resumed), or a welcome messge if `showWelcome` is `true`.
     *
     * @param initialState the initial state, in case an existing conversation is resumed
     * @param showWelcome whether to show a welcome message to the user
     */
    initialize(initialState : StateType|undefined, showWelcome : boolean) : Promise<DialogueHandler.ReplyResult|null>;
    /**
     * Retrieve the state of this dialogue handler.
     *
     * This method is called to serialize the dialogue handler to preserve the conversation.
     * `StateType` must be a JSON serializable type.
     */
    getState() : StateType;
    /**
     * Reset the state of the dialogue handler.
     *
     * The dialogue handler should return to the normal state, dropping any conversational context.
     */
    reset() : void;

    /**
     * Analyze the given command, to decide whether the command can be handled by this dialogue handler or not.
     *
     * @param command the command from the user
     */
    analyzeCommand(command : string) : Promise<AnalysisType>;

    /**
     * Produce the reply to the given (analyzed) command.
     *
     * This method will only be called if the dialogue handler is chosen to reply, so it is safe to perform
     * side effects in this method.
     *
     * @param command the analyzed command
     */
    getReply(command : AnalysisType) : Promise<DialogueHandler.ReplyResult>;
}

namespace DialogueHandler {

/**
 * The priority of this dialogue handler.
 */
export enum Priority {
    /**
     * Fallback, only used if no dialogue handler is available.
     *
     * Equivalent to "Sorry, I did not understand that."
     */
    FALLBACK,

    /**
     * Can take over if confident, or if no other dialogue handler is available.
     */
    SECONDARY,

    /**
     * Will always take over if confident or almost confident
     */
    PRIMARY,
}

/**
 * How confident the dialogue handler is that it can handle a given command.
 */
export enum Confidence {
    /**
     * The dialogue handler is confident that the command is in-domain.
     */
    CONFIDENT_IN_DOMAIN_COMMAND,

    /**
     * The command is potentially in-domain, but the confidence is low.
     */
    NONCONFIDENT_IN_DOMAIN_COMMAND,

    /**
     * The command is definitely out-of-domain and this dialogue handler cannot reply to this command.
     */
    OUT_OF_DOMAIN_COMMAND,
}

/**
 * The result of analyzing a command.
 *
 * A dialogue handler will produce a subclass of this object in its
 * {@link DialogueHandler.analyzeCommand} method, including additional
 * information specific to the dialogue handler.
 */
export interface CommandAnalysisResult {
    /**
     * How confident the dialogue handler is of the prediction.
     */
    confident : Confidence;

    /**
     * The utterance of the user.
     */
    utterance : string;
    /**
     * A ThingTalk representation of the current turn, if the dialogue handler is chosen.
     *
     * This is used exclusively in the conversation logs, and need not correspond to any
     * executable ThingTalk form, but should be valid ThingTalk syntax.
     */
    user_target : string;
}

/**
 * The reply generated by a dialogue handler.
 */
export interface ReplyResult {
    messages : Array<string|FormattedObject>;
    expecting : Type|null;

    // used in the conversation logs
    context : string;
    agent_target : string;
}

}

export default DialogueHandler;
