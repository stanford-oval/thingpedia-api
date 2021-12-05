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
     * The icon to use for this dialogue handler.
     *
     * This should be the identifier of a device in Thingpedia, e.g. `com.bing`. If `null`,
     * the default icon for the agent will be used.
     *
     * The icon will be associated with all messages from the dialogue handler. It can change
     * over the course of the dialogue.
     */
    icon : string|null;

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
     * Equivalent to "Sorry, I did not understand that." or throwing the
     * query to a search engine.
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
 * How confident the dialogue handler is that it can handle a given utterance.
 */
export enum Confidence {
    /**
     * The dialogue handler matched this utterance exactly (using some template
     * or regular expression), and it is a direct command that should take over
     * from other dialogue handlers.
     */
    EXACT_IN_DOMAIN_COMMAND,

    /**
     * The dialogue handler is strongly confident (above the normal confidence
     * level) that the utterance is in-domain, and it
     * is a direct command that should take over from other dialogue handlers.
     */
    STRONLY_CONFIDENT_IN_DOMAIN_COMMAND,

    /**
     * The dialogue handler is confident that the utterance is in-domain, and it
     * is a direct command that should take over from other dialogue handlers.
     *
     * This is the normal level of confidence that should be used in case confidence
     * estimation is not available.
     */
    CONFIDENT_IN_DOMAIN_COMMAND,

    /**
     * The utterance is potentially in-domain, but the confidence is low. The
     * utterance is recognized as a direct command that should take over from other
     * dialogue handlers.
     */
    NONCONFIDENT_IN_DOMAIN_COMMAND,

    /**
     * The dialogue handler matched this utterance exactly (using some template
     * or regular expression), and it is a follow-up to the current dialogue handler state.
     *
     * The utterance will not be dispatched if the dialogue handler is not current.
     */
    EXACT_IN_DOMAIN_FOLLOWUP,

    /**
     * The dialogue handler is strongly confident (above the normal confidence
     * level) that the utterance is in-domain, and it is a follow-up to the current
     * dialogue handler state.
     *
     * The utterance will not be dispatched if the dialogue handler is not current.
     */
    STRONGLY_CONFIDENT_IN_DOMAIN_FOLLOWUP,

    /**
     * The dialogue handler is confident that the utterance is in-domain, and it
     * is a follow-up to the current dialogue handler state.
     *
     * This is the normal level of confidence that should be used in case confidence
     * estimation is not available, and the utterance is a follow-up.
     *
     * The utterance will not be dispatched if the dialogue handler is not current.
     */
    CONFIDENT_IN_DOMAIN_FOLLOWUP,

    /**
     * The utteerance is potentially in-domain, but the confidence is low. The
     * utterance is recognized a follow-up to the current dialogue handler state.
     *
     * The utterance will not be dispatched if the dialogue handler is not current.
     */
    NONCONFIDENT_IN_DOMAIN_FOLLOWUP,

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
     * executable ThingTalk form, but must be valid ThingTalk syntax.
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
