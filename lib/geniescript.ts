import DialogueHandler from "./dialogue-handler";
import CommandAnalysisResult = DialogueHandler.CommandAnalysisResult;
import ReplyResult = DialogueHandler.ReplyResult;
import { Type } from "thingtalk";

interface LogicParameter {
    type : LogicParameterType;
    content : string;
}

enum LogicParameterType {
    UTTERANCE = "utterance",
    ANALYZED = "analyzed",
}

export abstract class AbstractGeniescriptHandler<AnalysisType extends DialogueHandler.CommandAnalysisResult> implements DialogueHandler<AnalysisType, string> {
    private _logic : AsyncGenerator<CommandAnalysisResult | ReplyResult> | null;

    protected constructor() {
        console.log("AbstractGeniescriptHandler constructor");
        this._logic = null;
        if (this.constructor === AbstractGeniescriptHandler)
            throw new Error("Abstract classes can't be instantiated.");
    }

    priority = DialogueHandler.Priority.PRIMARY;
    icon = null;

    getState() : string {
        // TODO: Implementation serialization
        return "geniescript state";
    }

    reset() : void {
        this._logic = this.logic();
        // noinspection JSIgnoredPromiseFromCall
        this._logic.next();
    }

    async initialize() {
        this._logic = this.logic();
        await this._logic.next();
        return null;
    }

    async analyzeCommand(utterance : string) : Promise<AnalysisType> {
        console.log("AbstractGeniescriptHandler analyzeCommand");
        const result = await this._logic!.next({ type: LogicParameterType.UTTERANCE, content: utterance });
        console.log(result.value);
        return result.value;
    }

    async getReply(analyzed : AnalysisType) : Promise<DialogueHandler.ReplyResult> {
        const result0 = this._logic!.next({ type: LogicParameterType.ANALYZED, content: analyzed });
        const result = await result0;
        return result.value;
    }

    abstract logic() : AsyncGenerator<CommandAnalysisResult | ReplyResult, LogicParameter>;
}

export class GeniescriptDlg {
    private readonly _user_target : string;
    private readonly _skill_name : string;
    private _last_result : CommandAnalysisResult | ReplyResult | null;
    private _last_branch : string | null;
    private _last_analyzed : string | null;
    private _last_messages : string[];
    private _last_expecting : Type | null;
    private _last_target : string | null;


    constructor(user_target : string, skill_name : string) {
        this._user_target = user_target;
        this._skill_name = skill_name;
        this._last_result = null;
        this._last_branch = null;
        this._last_analyzed = null;
        this._last_messages = [];
        this._last_expecting = null;
        this._last_target = null;
    }

    async *expect(
        func_map : Map<string,
            (GeneratorFunction | AsyncGeneratorFunction | (() => Promise<any>)| (() => any))
            >
    ) : AsyncGenerator<CommandAnalysisResult | ReplyResult | null, LogicParameter, any> {
        if (this._last_analyzed !== null) {
            this._last_result = {
                messages: this._last_messages,
                expecting: this._last_expecting,
                context: this._last_analyzed,
                agent_target: this._last_target!
            };
            this._last_messages = [];
            this._last_expecting = null;
            this._last_target = null;
            this._last_analyzed = null;
        }
        while (true) {
            const input = yield this._last_result;
            if (input.type === "utterance") {
                this._last_result = {
                    confident: DialogueHandler.Confidence.OUT_OF_DOMAIN_COMMAND,
                    utterance: input.content,
                    user_target: ''
                };
                for (const func_key of func_map.keys()) {
                    const regExp = new RegExp(func_key, 'i');
                    const match = regExp.exec(input.content);
                    if (match) {
                        this._last_branch = func_key;
                        this._last_result = {
                            confident: DialogueHandler.Confidence.EXACT_IN_DOMAIN_COMMAND,
                            utterance: input.content,
                            user_target: this._user_target
                        };
                        break;
                    }
                }
            } else if (input.type === "analyzed") {
                this._last_analyzed = input.content;
                const current_func = func_map.get(this._last_branch!)!;
                if (current_func.constructor.name === "GeneratorFunction" || current_func.constructor.name === "AsyncGeneratorFunction")
                    return yield* current_func();
                else if (current_func.constructor.name === "AsyncFunction" || current_func.constructor.name === "Function" )
                    return current_func();
                else
                    throw Error("current_func is not a Function or GeneratorFunction");
            }
        }
    }

    // TODO: say something in the middle of the process
    say(messages : string[], target : string | null = null , expecting : Type | null = null) {
        if (target === null) target = this._skill_name + ".reply";
        this._last_messages = this._last_messages.concat(messages);
        this._last_target = target;
        this._last_expecting = expecting;
    }
}