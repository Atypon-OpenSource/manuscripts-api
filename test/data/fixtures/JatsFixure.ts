/*!
 * © 2024 Atypon Systems LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export const CITATION_STYLE =
  '<?xml version="1.0" encoding="utf-8"?>\n' +
  '<style xmlns="http://purl.org/net/xbiblio/csl" class="in-text" version="1.0" demote-non-dropping-particle="sort-only" default-locale="en-US" page-range-format="expanded">\n' +
  '  <info>\n' +
  '    <title>American Medical Association</title>\n' +
  '    <title-short>AMA</title-short>\n' +
  '    <id>http://www.zotero.org/styles/american-medical-association</id>\n' +
  '    <link href="http://www.zotero.org/styles/american-medical-association" rel="self"/>\n' +
  '    <link href="https://westlibrary.txwes.edu/sites/default/files/pdf/AMACitationStyle.pdf" rel="documentation"/>\n' +
  '    <author>\n' +
  '      <name>Julian Onions</name>\n' +
  '      <email>julian.onions@gmail.com</email>\n' +
  '    </author>\n' +
  '    <contributor>\n' +
  '      <name>Christian Pietsch</name>\n' +
  '      <uri>http://purl.org/net/pietsch</uri>\n' +
  '    </contributor>\n' +
  '    <contributor>\n' +
  '      <name>Daniel W Chan</name>\n' +
  '      <email>danwchan@protonmail.com</email>\n' +
  '    </contributor>\n' +
  '    <category citation-format="numeric"/>\n' +
  '    <category field="medicine"/>\n' +
  '    <summary>The American Medical Association style as used in JAMA.</summary>\n' +
  '    <updated>2019-03-07T04:35:47+00:00</updated>\n' +
  '    <rights license="http://creativecommons.org/licenses/by-sa/3.0/">This work is licensed under a Creative Commons Attribution-ShareAlike 3.0 License</rights>\n' +
  '  </info>\n' +
  '  <locale xml:lang="en">\n' +
  '    <terms>\n' +
  '      <term name="page-range-delimiter">-</term>\n' +
  '    </terms>\n' +
  '  </locale>\n' +
  '  <macro name="editor">\n' +
  '    <names variable="editor">\n' +
  '      <name name-as-sort-order="all" sort-separator=" " initialize-with="" delimiter=", " delimiter-precedes-last="always"/>\n' +
  '      <label form="short" prefix=", "/>\n' +
  '    </names>\n' +
  '  </macro>\n' +
  '  <macro name="author">\n' +
  '    <group suffix=".">\n' +
  '      <names variable="author">\n' +
  '        <name name-as-sort-order="all" sort-separator=" " initialize-with="" delimiter=", " delimiter-precedes-last="always"/>\n' +
  '        <label form="short" prefix=", "/>\n' +
  '        <substitute>\n' +
  '          <names variable="editor"/>\n' +
  '          <text macro="title"/>\n' +
  '        </substitute>\n' +
  '      </names>\n' +
  '    </group>\n' +
  '  </macro>\n' +
  '  <macro name="access">\n' +
  '    <choose>\n' +
  '      <if type="article-newspaper" match="none">\n' +
  '        <choose>\n' +
  '          <if variable="DOI">\n' +
  '            <text value="doi:"/>\n' +
  '            <text variable="DOI"/>\n' +
  '          </if>\n' +
  '          <else-if variable="URL">\n' +
  '            <group delimiter=". " suffix=".">\n' +
  '              <text variable="URL"/>\n' +
  '              <choose>\n' +
  '                <if type="webpage">\n' +
  '                  <date variable="issued" prefix="Published " form="text"/>\n' +
  '                </if>\n' +
  '              </choose>\n' +
  '              <group>\n' +
  '                <text term="accessed" text-case="capitalize-first" suffix=" "/>\n' +
  '                <date variable="accessed">\n' +
  '                  <date-part name="month" suffix=" "/>\n' +
  '                  <date-part name="day" suffix=", "/>\n' +
  '                  <date-part name="year"/>\n' +
  '                </date>\n' +
  '              </group>\n' +
  '            </group>\n' +
  '          </else-if>\n' +
  '        </choose>\n' +
  '      </if>\n' +
  '    </choose>\n' +
  '  </macro>\n' +
  '  <macro name="title">\n' +
  '    <choose>\n' +
  '      <if type="bill book graphic legal_case legislation motion_picture report song" match="any">\n' +
  '        <text variable="title" font-style="italic" text-case="title"/>\n' +
  '      </if>\n' +
  '      <else>\n' +
  '        <text variable="title"/>\n' +
  '      </else>\n' +
  '    </choose>\n' +
  '  </macro>\n' +
  '  <macro name="publisher">\n' +
  '    <group delimiter=": ">\n' +
  '      <text variable="publisher-place"/>\n' +
  '      <text variable="publisher"/>\n' +
  '    </group>\n' +
  '  </macro>\n' +
  '  <macro name="edition">\n' +
  '    <choose>\n' +
  '      <if is-numeric="edition">\n' +
  '        <group delimiter=" ">\n' +
  '          <number variable="edition" form="ordinal"/>\n' +
  '          <text term="edition" form="short"/>\n' +
  '        </group>\n' +
  '      </if>\n' +
  '      <else>\n' +
  '        <text variable="edition" suffix="."/>\n' +
  '      </else>\n' +
  '    </choose>\n' +
  '  </macro>\n' +
  '  <citation collapse="citation-number">\n' +
  '    <sort>\n' +
  '      <key variable="citation-number"/>\n' +
  '    </sort>\n' +
  '    <layout delimiter="," vertical-align="sup">\n' +
  '      <text variable="citation-number"/>\n' +
  '      <group prefix="(" suffix=")">\n' +
  '        <label variable="locator" form="short" strip-periods="true"/>\n' +
  '        <text variable="locator"/>\n' +
  '      </group>\n' +
  '    </layout>\n' +
  '  </citation>\n' +
  '  <bibliography hanging-indent="false" et-al-min="7" et-al-use-first="3" second-field-align="flush">\n' +
  '    <layout>\n' +
  '      <text variable="citation-number" suffix=". "/>\n' +
  '      <text macro="author"/>\n' +
  '      <text macro="title" prefix=" " suffix="."/>\n' +
  '      <choose>\n' +
  '        <if type="bill book graphic legislation motion_picture report song" match="any">\n' +
  '          <group suffix="." prefix=" " delimiter=" ">\n' +
  '            <group delimiter=" ">\n' +
  '              <text term="volume" form="short" text-case="capitalize-first" strip-periods="true"/>\n' +
  '              <text variable="volume" suffix="."/>\n' +
  '            </group>\n' +
  '            <text macro="edition"/>\n' +
  '            <text macro="editor" prefix="(" suffix=")"/>\n' +
  '          </group>\n' +
  '          <text macro="publisher" prefix=" "/>\n' +
  '          <group suffix="." prefix="; ">\n' +
  '            <date variable="issued">\n' +
  '              <date-part name="year"/>\n' +
  '            </date>\n' +
  '            <text variable="page" prefix=":"/>\n' +
  '          </group>\n' +
  '        </if>\n' +
  '        <else-if type="chapter paper-conference entry-dictionary entry-encyclopedia" match="any">\n' +
  '          <group prefix=" " delimiter=" ">\n' +
  '            <text term="in" text-case="capitalize-first" suffix=":"/>\n' +
  '            <text macro="editor"/>\n' +
  '            <text variable="container-title" font-style="italic" suffix="." text-case="title"/>\n' +
  '            <group delimiter=" ">\n' +
  '              <text term="volume" form="short" text-case="capitalize-first" strip-periods="true"/>\n' +
  '              <text variable="volume" suffix="."/>\n' +
  '            </group>\n' +
  '            <text macro="edition"/>\n' +
  '            <text variable="collection-title" suffix="."/>\n' +
  '            <group suffix=".">\n' +
  '              <text macro="publisher"/>\n' +
  '              <group suffix="." prefix="; ">\n' +
  '                <date variable="issued">\n' +
  '                  <date-part name="year"/>\n' +
  '                </date>\n' +
  '                <text variable="page" prefix=":"/>\n' +
  '              </group>\n' +
  '            </group>\n' +
  '          </group>\n' +
  '        </else-if>\n' +
  '        <else-if type="article-newspaper">\n' +
  '          <text variable="container-title" font-style="italic" prefix=" " suffix=". "/>\n' +
  '          <choose>\n' +
  '            <if variable="URL">\n' +
  '              <group delimiter=". " suffix=".">\n' +
  '                <text variable="URL"/>\n' +
  '                <group prefix="Published ">\n' +
  '                  <date variable="issued">\n' +
  '                    <date-part name="month" suffix=" "/>\n' +
  '                    <date-part name="day" suffix=", "/>\n' +
  '                    <date-part name="year"/>\n' +
  '                  </date>\n' +
  '                </group>\n' +
  '                <group>\n' +
  '                  <text term="accessed" text-case="capitalize-first" suffix=" "/>\n' +
  '                  <date variable="accessed">\n' +
  '                    <date-part name="month" suffix=" "/>\n' +
  '                    <date-part name="day" suffix=", "/>\n' +
  '                    <date-part name="year"/>\n' +
  '                  </date>\n' +
  '                </group>\n' +
  '              </group>\n' +
  '            </if>\n' +
  '            <else>\n' +
  '              <group delimiter=":" suffix=".">\n' +
  '                <group>\n' +
  '                  <date variable="issued">\n' +
  '                    <date-part name="month" suffix=" "/>\n' +
  '                    <date-part name="day" suffix=", "/>\n' +
  '                    <date-part name="year"/>\n' +
  '                  </date>\n' +
  '                </group>\n' +
  '                <text variable="page"/>\n' +
  '              </group>\n' +
  '            </else>\n' +
  '          </choose>\n' +
  '        </else-if>\n' +
  '        <else-if type="legal_case">\n' +
  '          <group suffix="," prefix=" " delimiter=" ">\n' +
  '            <text macro="editor" prefix="(" suffix=")"/>\n' +
  '          </group>\n' +
  '          <group prefix=" " delimiter=" ">\n' +
  '            <text variable="container-title"/>\n' +
  '            <text variable="volume"/>\n' +
  '          </group>\n' +
  '          <text variable="page" prefix=", " suffix=" "/>\n' +
  '          <group prefix="(" suffix=")." delimiter=" ">\n' +
  '            <text variable="authority"/>\n' +
  '            <date variable="issued">\n' +
  '              <date-part name="year"/>\n' +
  '            </date>\n' +
  '          </group>\n' +
  '        </else-if>\n' +
  '        <else-if type="webpage">\n' +
  '          <text variable="container-title" prefix=" " suffix="."/>\n' +
  '        </else-if>\n' +
  '        <else-if type="speech">\n' +
  '          <group prefix=" " suffix=":">\n' +
  '            <choose>\n' +
  '              <if variable="genre">\n' +
  '                <text variable="genre" suffix=" "/>\n' +
  '                <text term="presented at"/>\n' +
  '              </if>\n' +
  '              <else>\n' +
  '                <text term="presented at" text-case="capitalize-first"/>\n' +
  '              </else>\n' +
  '            </choose>\n' +
  '          </group>\n' +
  '          <group delimiter="; " prefix=" " suffix=".">\n' +
  '            <text variable="event"/>\n' +
  '            <group>\n' +
  '              <date delimiter=" " variable="issued">\n' +
  '                <date-part name="month"/>\n' +
  '                <date-part name="day" suffix=","/>\n' +
  '                <date-part name="year"/>\n' +
  '              </date>\n' +
  '            </group>\n' +
  '            <text variable="event-place"/>\n' +
  '          </group>\n' +
  '        </else-if>\n' +
  '        <else>\n' +
  '          <text macro="editor" prefix=" " suffix="."/>\n' +
  '          <group prefix=" " suffix=".">\n' +
  '            <text variable="container-title" font-style="italic" form="short" strip-periods="true" suffix="."/>\n' +
  '            <group delimiter=";" prefix=" ">\n' +
  '              <choose>\n' +
  '                <if variable="issue volume" match="any">\n' +
  '                  <date variable="issued">\n' +
  '                    <date-part name="year"/>\n' +
  '                  </date>\n' +
  '                </if>\n' +
  '                <else>\n' +
  '                  <date variable="issued">\n' +
  '                    <date-part name="month" suffix=" "/>\n' +
  '                    <date-part name="year"/>\n' +
  '                  </date>\n' +
  '                </else>\n' +
  '              </choose>\n' +
  '              <group>\n' +
  '                <text variable="volume"/>\n' +
  '                <text variable="issue" prefix="(" suffix=")"/>\n' +
  '              </group>\n' +
  '            </group>\n' +
  '            <text variable="page" prefix=":"/>\n' +
  '          </group>\n' +
  '        </else>\n' +
  '      </choose>\n' +
  '      <text prefix=" " macro="access"/>\n' +
  '    </layout>\n' +
  '  </bibliography>\n' +
  '</style>\n'
export const LOCALE =
  '<?xml version="1.0" encoding="utf-8"?>\n' +
  '<locale xmlns="http://purl.org/net/xbiblio/csl" version="1.0" xml:lang="en-US">\n' +
  '  <info>\n' +
  '    <translator>\n' +
  '      <name>Andrew Dunning</name>\n' +
  '    </translator>\n' +
  '    <translator>\n' +
  '      <name>Sebastian Karcher</name>\n' +
  '    </translator>\n' +
  '    <translator>\n' +
  '      <name>Rintze M. Zelle</name>\n' +
  '    </translator>\n' +
  '    <rights license="http://creativecommons.org/licenses/by-sa/3.0/">This work is licensed under a Creative Commons Attribution-ShareAlike 3.0 License</rights>\n' +
  '    <updated>2015-10-10T23:31:02+00:00</updated>\n' +
  '  </info>\n' +
  '  <style-options punctuation-in-quote="true"/>\n' +
  '  <date form="text">\n' +
  '    <date-part name="month" suffix=" "/>\n' +
  '    <date-part name="day" suffix=", "/>\n' +
  '    <date-part name="year"/>\n' +
  '  </date>\n' +
  '  <date form="numeric">\n' +
  '    <date-part name="month" form="numeric-leading-zeros" suffix="/"/>\n' +
  '    <date-part name="day" form="numeric-leading-zeros" suffix="/"/>\n' +
  '    <date-part name="year"/>\n' +
  '  </date>\n' +
  '  <terms>\n' +
  '    <term name="accessed">accessed</term>\n' +
  '    <term name="and">and</term>\n' +
  '    <term name="and others">and others</term>\n' +
  '    <term name="anonymous">anonymous</term>\n' +
  '    <term name="anonymous" form="short">anon.</term>\n' +
  '    <term name="at">at</term>\n' +
  '    <term name="available at">available at</term>\n' +
  '    <term name="by">by</term>\n' +
  '    <term name="circa">circa</term>\n' +
  '    <term name="circa" form="short">c.</term>\n' +
  '    <term name="cited">cited</term>\n' +
  '    <term name="edition">\n' +
  '      <single>edition</single>\n' +
  '      <multiple>editions</multiple>\n' +
  '    </term>\n' +
  '    <term name="edition" form="short">ed.</term>\n' +
  '    <term name="et-al">et al.</term>\n' +
  '    <term name="forthcoming">forthcoming</term>\n' +
  '    <term name="from">from</term>\n' +
  '    <term name="ibid">ibid.</term>\n' +
  '    <term name="in">in</term>\n' +
  '    <term name="in press">in press</term>\n' +
  '    <term name="internet">internet</term>\n' +
  '    <term name="interview">interview</term>\n' +
  '    <term name="letter">letter</term>\n' +
  '    <term name="no date">no date</term>\n' +
  '    <term name="no date" form="short">n.d.</term>\n' +
  '    <term name="online">online</term>\n' +
  '    <term name="presented at">presented at the</term>\n' +
  '    <term name="reference">\n' +
  '      <single>reference</single>\n' +
  '      <multiple>references</multiple>\n' +
  '    </term>\n' +
  '    <term name="reference" form="short">\n' +
  '      <single>ref.</single>\n' +
  '      <multiple>refs.</multiple>\n' +
  '    </term>\n' +
  '    <term name="retrieved">retrieved</term>\n' +
  '    <term name="scale">scale</term>\n' +
  '    <term name="version">version</term>\n' +
  '\n' +
  '    <!-- ANNO DOMINI; BEFORE CHRIST -->\n' +
  '    <term name="ad">AD</term>\n' +
  '    <term name="bc">BC</term>\n' +
  '\n' +
  '    <!-- PUNCTUATION -->\n' +
  '    <term name="open-quote">“</term>\n' +
  '    <term name="close-quote">”</term>\n' +
  '    <term name="open-inner-quote">‘</term>\n' +
  '    <term name="close-inner-quote">’</term>\n' +
  '    <term name="page-range-delimiter">–</term>\n' +
  '\n' +
  '    <!-- ORDINALS -->\n' +
  '    <term name="ordinal">th</term>\n' +
  '    <term name="ordinal-01">st</term>\n' +
  '    <term name="ordinal-02">nd</term>\n' +
  '    <term name="ordinal-03">rd</term>\n' +
  '    <term name="ordinal-11">th</term>\n' +
  '    <term name="ordinal-12">th</term>\n' +
  '    <term name="ordinal-13">th</term>\n' +
  '\n' +
  '    <!-- LONG ORDINALS -->\n' +
  '    <term name="long-ordinal-01">first</term>\n' +
  '    <term name="long-ordinal-02">second</term>\n' +
  '    <term name="long-ordinal-03">third</term>\n' +
  '    <term name="long-ordinal-04">fourth</term>\n' +
  '    <term name="long-ordinal-05">fifth</term>\n' +
  '    <term name="long-ordinal-06">sixth</term>\n' +
  '    <term name="long-ordinal-07">seventh</term>\n' +
  '    <term name="long-ordinal-08">eighth</term>\n' +
  '    <term name="long-ordinal-09">ninth</term>\n' +
  '    <term name="long-ordinal-10">tenth</term>\n' +
  '\n' +
  '    <!-- LONG LOCATOR FORMS -->\n' +
  '    <term name="book">\n' +
  '      <single>book</single>\n' +
  '      <multiple>books</multiple>\n' +
  '    </term>\n' +
  '    <term name="chapter">\n' +
  '      <single>chapter</single>\n' +
  '      <multiple>chapters</multiple>\n' +
  '    </term>\n' +
  '    <term name="column">\n' +
  '      <single>column</single>\n' +
  '      <multiple>columns</multiple>\n' +
  '    </term>\n' +
  '    <term name="figure">\n' +
  '      <single>figure</single>\n' +
  '      <multiple>figures</multiple>\n' +
  '    </term>\n' +
  '    <term name="folio">\n' +
  '      <single>folio</single>\n' +
  '      <multiple>folios</multiple>\n' +
  '    </term>\n' +
  '    <term name="issue">\n' +
  '      <single>number</single>\n' +
  '      <multiple>numbers</multiple>\n' +
  '    </term>\n' +
  '    <term name="line">\n' +
  '      <single>line</single>\n' +
  '      <multiple>lines</multiple>\n' +
  '    </term>\n' +
  '    <term name="note">\n' +
  '      <single>note</single>\n' +
  '      <multiple>notes</multiple>\n' +
  '    </term>\n' +
  '    <term name="opus">\n' +
  '      <single>opus</single>\n' +
  '      <multiple>opera</multiple>\n' +
  '    </term>\n' +
  '    <term name="page">\n' +
  '      <single>page</single>\n' +
  '      <multiple>pages</multiple>\n' +
  '    </term>\n' +
  '    <term name="number-of-pages">\n' +
  '      <single>page</single>\n' +
  '      <multiple>pages</multiple>\n' +
  '    </term>\n' +
  '    <term name="paragraph">\n' +
  '      <single>paragraph</single>\n' +
  '      <multiple>paragraphs</multiple>\n' +
  '    </term>\n' +
  '    <term name="part">\n' +
  '      <single>part</single>\n' +
  '      <multiple>parts</multiple>\n' +
  '    </term>\n' +
  '    <term name="section">\n' +
  '      <single>section</single>\n' +
  '      <multiple>sections</multiple>\n' +
  '    </term>\n' +
  '    <term name="sub verbo">\n' +
  '      <single>sub verbo</single>\n' +
  '      <multiple>sub verbis</multiple>\n' +
  '    </term>\n' +
  '    <term name="verse">\n' +
  '      <single>verse</single>\n' +
  '      <multiple>verses</multiple>\n' +
  '    </term>\n' +
  '    <term name="volume">\n' +
  '      <single>volume</single>\n' +
  '      <multiple>volumes</multiple>\n' +
  '    </term>\n' +
  '\n' +
  '    <!-- SHORT LOCATOR FORMS -->\n' +
  '    <term name="book" form="short">\n' +
  '      <single>bk.</single>\n' +
  '      <multiple>bks.</multiple>\n' +
  '    </term>\n' +
  '    <term name="chapter" form="short">\n' +
  '      <single>chap.</single>\n' +
  '      <multiple>chaps.</multiple>\n' +
  '    </term>\n' +
  '    <term name="column" form="short">\n' +
  '      <single>col.</single>\n' +
  '      <multiple>cols.</multiple>\n' +
  '    </term>\n' +
  '    <term name="figure" form="short">\n' +
  '      <single>fig.</single>\n' +
  '      <multiple>figs.</multiple>\n' +
  '    </term>\n' +
  '    <term name="folio" form="short">\n' +
  '      <single>fol.</single>\n' +
  '      <multiple>fols.</multiple>\n' +
  '    </term>\n' +
  '    <term name="issue" form="short">\n' +
  '      <single>no.</single>\n' +
  '      <multiple>nos.</multiple>\n' +
  '    </term>\n' +
  '    <term name="line" form="short">\n' +
  '      <single>l.</single>\n' +
  '      <multiple>ll.</multiple>\n' +
  '    </term>\n' +
  '    <term name="note" form="short">\n' +
  '      <single>n.</single>\n' +
  '      <multiple>nn.</multiple>\n' +
  '    </term>\n' +
  '    <term name="opus" form="short">\n' +
  '      <single>op.</single>\n' +
  '      <multiple>opp.</multiple>\n' +
  '    </term>\n' +
  '    <term name="page" form="short">\n' +
  '      <single>p.</single>\n' +
  '      <multiple>pp.</multiple>\n' +
  '    </term>\n' +
  '    <term name="number-of-pages" form="short">\n' +
  '      <single>p.</single>\n' +
  '      <multiple>pp.</multiple>\n' +
  '    </term>\n' +
  '    <term name="paragraph" form="short">\n' +
  '      <single>para.</single>\n' +
  '      <multiple>paras.</multiple>\n' +
  '    </term>\n' +
  '    <term name="part" form="short">\n' +
  '      <single>pt.</single>\n' +
  '      <multiple>pts.</multiple>\n' +
  '    </term>\n' +
  '    <term name="section" form="short">\n' +
  '      <single>sec.</single>\n' +
  '      <multiple>secs.</multiple>\n' +
  '    </term>\n' +
  '    <term name="sub verbo" form="short">\n' +
  '      <single>s.v.</single>\n' +
  '      <multiple>s.vv.</multiple>\n' +
  '    </term>\n' +
  '    <term name="verse" form="short">\n' +
  '      <single>v.</single>\n' +
  '      <multiple>vv.</multiple>\n' +
  '    </term>\n' +
  '    <term name="volume" form="short">\n' +
  '      <single>vol.</single>\n' +
  '      <multiple>vols.</multiple>\n' +
  '    </term>\n' +
  '\n' +
  '    <!-- SYMBOL LOCATOR FORMS -->\n' +
  '    <term name="paragraph" form="symbol">\n' +
  '      <single>¶</single>\n' +
  '      <multiple>¶¶</multiple>\n' +
  '    </term>\n' +
  '    <term name="section" form="symbol">\n' +
  '      <single>§</single>\n' +
  '      <multiple>§§</multiple>\n' +
  '    </term>\n' +
  '\n' +
  '    <!-- LONG ROLE FORMS -->\n' +
  '    <term name="director">\n' +
  '      <single>director</single>\n' +
  '      <multiple>directors</multiple>\n' +
  '    </term>\n' +
  '    <term name="editor">\n' +
  '      <single>editor</single>\n' +
  '      <multiple>editors</multiple>\n' +
  '    </term>\n' +
  '    <term name="editorial-director">\n' +
  '      <single>editor</single>\n' +
  '      <multiple>editors</multiple>\n' +
  '    </term>\n' +
  '    <term name="illustrator">\n' +
  '      <single>illustrator</single>\n' +
  '      <multiple>illustrators</multiple>\n' +
  '    </term>\n' +
  '    <term name="translator">\n' +
  '      <single>translator</single>\n' +
  '      <multiple>translators</multiple>\n' +
  '    </term>\n' +
  '    <term name="editortranslator">\n' +
  '      <single>editor &amp; translator</single>\n' +
  '      <multiple>editors &amp; translators</multiple>\n' +
  '    </term>\n' +
  '\n' +
  '    <!-- SHORT ROLE FORMS -->\n' +
  '    <term name="director" form="short">\n' +
  '      <single>dir.</single>\n' +
  '      <multiple>dirs.</multiple>\n' +
  '    </term>\n' +
  '    <term name="editor" form="short">\n' +
  '      <single>ed.</single>\n' +
  '      <multiple>eds.</multiple>\n' +
  '    </term>\n' +
  '    <term name="editorial-director" form="short">\n' +
  '      <single>ed.</single>\n' +
  '      <multiple>eds.</multiple>\n' +
  '    </term>\n' +
  '    <term name="illustrator" form="short">\n' +
  '      <single>ill.</single>\n' +
  '      <multiple>ills.</multiple>\n' +
  '    </term>\n' +
  '    <term name="translator" form="short">\n' +
  '      <single>tran.</single>\n' +
  '      <multiple>trans.</multiple>\n' +
  '    </term>\n' +
  '    <term name="editortranslator" form="short">\n' +
  '      <single>ed. &amp; tran.</single>\n' +
  '      <multiple>eds. &amp; trans.</multiple>\n' +
  '    </term>\n' +
  '\n' +
  '    <!-- VERB ROLE FORMS -->\n' +
  '    <term name="container-author" form="verb">by</term>\n' +
  '    <term name="director" form="verb">directed by</term>\n' +
  '    <term name="editor" form="verb">edited by</term>\n' +
  '    <term name="editorial-director" form="verb">edited by</term>\n' +
  '    <term name="illustrator" form="verb">illustrated by</term>\n' +
  '    <term name="interviewer" form="verb">interview by</term>\n' +
  '    <term name="recipient" form="verb">to</term>\n' +
  '    <term name="reviewed-author" form="verb">by</term>\n' +
  '    <term name="translator" form="verb">translated by</term>\n' +
  '    <term name="editortranslator" form="verb">edited &amp; translated by</term>\n' +
  '\n' +
  '    <!-- SHORT VERB ROLE FORMS -->\n' +
  '    <term name="director" form="verb-short">dir. by</term>\n' +
  '    <term name="editor" form="verb-short">ed. by</term>\n' +
  '    <term name="editorial-director" form="verb-short">ed. by</term>\n' +
  '    <term name="illustrator" form="verb-short">illus. by</term>\n' +
  '    <term name="translator" form="verb-short">trans. by</term>\n' +
  '    <term name="editortranslator" form="verb-short">ed. &amp; trans. by</term>\n' +
  '\n' +
  '    <!-- LONG MONTH FORMS -->\n' +
  '    <term name="month-01">January</term>\n' +
  '    <term name="month-02">February</term>\n' +
  '    <term name="month-03">March</term>\n' +
  '    <term name="month-04">April</term>\n' +
  '    <term name="month-05">May</term>\n' +
  '    <term name="month-06">June</term>\n' +
  '    <term name="month-07">July</term>\n' +
  '    <term name="month-08">August</term>\n' +
  '    <term name="month-09">September</term>\n' +
  '    <term name="month-10">October</term>\n' +
  '    <term name="month-11">November</term>\n' +
  '    <term name="month-12">December</term>\n' +
  '\n' +
  '    <!-- SHORT MONTH FORMS -->\n' +
  '    <term name="month-01" form="short">Jan.</term>\n' +
  '    <term name="month-02" form="short">Feb.</term>\n' +
  '    <term name="month-03" form="short">Mar.</term>\n' +
  '    <term name="month-04" form="short">Apr.</term>\n' +
  '    <term name="month-05" form="short">May</term>\n' +
  '    <term name="month-06" form="short">Jun.</term>\n' +
  '    <term name="month-07" form="short">Jul.</term>\n' +
  '    <term name="month-08" form="short">Aug.</term>\n' +
  '    <term name="month-09" form="short">Sep.</term>\n' +
  '    <term name="month-10" form="short">Oct.</term>\n' +
  '    <term name="month-11" form="short">Nov.</term>\n' +
  '    <term name="month-12" form="short">Dec.</term>\n' +
  '\n' +
  '    <!-- SEASONS -->\n' +
  '    <term name="season-01">Spring</term>\n' +
  '    <term name="season-02">Summer</term>\n' +
  '    <term name="season-03">Autumn</term>\n' +
  '    <term name="season-04">Winter</term>\n' +
  '  </terms>\n' +
  '</locale>\n'
